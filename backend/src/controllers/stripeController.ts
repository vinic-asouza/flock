import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe, STRIPE_PRICE_IDS, getOrCreateCustomer, createCheckoutSession, createCustomerPortalSession, updateSubscription } from '../services/stripe';
import supabase, { supabaseAdmin } from '../services/supabase';
import { AuthRequest } from '../types';
import { formatErrorResponse, getFriendlyErrorMessage } from '../utils/errorMessages';
import { PLAN_CONFIG, getPlanConfig, getAllPlans, getPlanName, getPlanPrice } from '../config/plans';
import { error, warn, debug, info } from '../utils/logger';
import { sendEmail } from '../services/emailService';
import { getPaymentSuccessTemplate, getPaymentFailedTemplate, getSubscriptionCanceledTemplate, getRenewalSuccessTemplate, getPlanChangedTemplate, getSubscriptionReactivatedTemplate } from '../templates/stripeEmailTemplates';

/**
 * Criar sessão de checkout
 * POST /api/stripe/create-checkout-session
 */
export const createCheckout = async (req: AuthRequest, res: Response) => {
  try {
    const { plan } = req.body;

    // Validar plano (100 não precisa de checkout, é gratuito)
    if (!plan || !['200', '500', '800'].includes(plan)) {
      return res.status(400).json({
        error: 'Plano inválido',
        details: 'Plano deve ser: 200, 500 ou 800',
      });
    }

    // Obter price_id do plano
    const priceId = STRIPE_PRICE_IDS[plan as keyof typeof STRIPE_PRICE_IDS];
    if (!priceId) {
      error(`Price ID não configurado para o plano: ${plan}`, {
        userId: req.user?.id,
        planType: plan,
      });
      return res.status(500).json({
        error: 'Plano não configurado',
        details: `Price ID para o plano ${plan} não está configurado. Verifique as variáveis de ambiente STRIPE_PRICE_ID_${plan}`,
      });
    }

    // Tentar autenticar novamente se não estiver autenticado mas houver cookies
    if (!req.user && req.cookies) {
      const { cookieConfig } = require('../utils/cookieUtils');
      const accessToken = req.cookies[cookieConfig.names.accessToken];

      if (accessToken) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser(accessToken);
          if (!error && user) {
            req.user = {
              id: user.id,
              email: user.email || ''
            };
          } else if (error) {
            // Tentar renovar token
            const refreshToken = req.cookies[cookieConfig.names.refreshToken];
            if (refreshToken) {
              const { data: authData } = await supabase.auth.refreshSession({
                refresh_token: refreshToken
              });
              if (authData?.user) {
                req.user = {
                  id: authData.user.id,
                  email: authData.user.email || ''
                };
              }
            }
          }
        } catch (authError) {
          console.error('❌ Erro ao tentar autenticar:', authError);
        }
      }
    }

    // Se usuário autenticado, buscar dados da igreja
    let customerId: string;
    let churchId: string | undefined;
    let customerEmail: string;
    let customerName: string;

    if (req.user && req.church) {
      const { data: church, error: churchError } = await supabase
        .from('churches')
        .select('id, name, email_church, user_id, stripe_customer_id')
        .eq('id', req.church.churchId)
        .single();

      if (churchError || !church) {
        return res.status(404).json({
          error: 'Igreja não encontrada',
          details: 'Usuário não possui igreja cadastrada',
        });
      }

      churchId = church.id;
      // Sempre usar o email principal da conta (req.user.email) para o checkout do Stripe
      // O email_church é apenas opcional e não deve ser usado para pagamentos
      customerEmail = req.user.email!;
      customerName = church.name;

      // Se já tem customer_id, usar ele
      if (church.stripe_customer_id) {
        customerId = church.stripe_customer_id;
      } else {
        // Criar ou buscar cliente no Stripe
        const customer = await getOrCreateCustomer(
          customerEmail,
          customerName,
          {
            church_id: church.id,
            user_id: req.user.id,
          }
        );
        customerId = customer.id;

        // Salvar customer_id na igreja
        await supabase
          .from('churches')
          .update({ stripe_customer_id: customerId })
          .eq('id', church.id);
      }
    } else {
      // Usuário não autenticado (checkout da landing page)
      const { email, name, church_id } = req.body;

      if (!email || !name) {
        return res.status(400).json({
          error: 'Email e nome são obrigatórios',
          details: 'Para checkout não autenticado, é necessário fornecer email e nome no body da requisição',
        });
      }

      customerEmail = email;
      customerName = name;
      churchId = church_id;

      // Criar cliente temporário no Stripe
      const customer = await getOrCreateCustomer(
        customerEmail,
        customerName,
        {
          church_id: church_id || 'pending',
        }
      );
      customerId = customer.id;
    }

    // URLs de redirecionamento
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const successUrl = `${frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/subscription/cancel`;

    // Criar sessão de checkout
    const session = await createCheckoutSession(
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      {
        plan,
        church_id: churchId || 'pending',
        customer_email: customerEmail,
      }
    );

    res.json({
      session_id: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Erro ao criar checkout:', error);

    // Log detalhado do erro
    if (error.type === 'StripeInvalidRequestError') {
      console.error('Erro do Stripe:', {
        type: error.type,
        message: error.message,
        code: error.code,
        param: error.param,
      });
    }

    const errorResponse = formatErrorResponse(error, 'Erro ao criar sessão de checkout');
    res.status(500).json(errorResponse);
  }
};

/**
 * Criar sessão do portal do cliente
 * POST /api/stripe/create-portal-session
 */
export const createPortalSession = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autenticado',
        details: 'É necessário estar autenticado para acessar o portal',
      });
    }

    // Buscar igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('stripe_customer_id')
      .eq('id', req.church!.churchId)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
      });
    }

    if (!church.stripe_customer_id) {
      return res.status(400).json({
        error: 'Cliente não possui assinatura',
        details: 'É necessário ter uma assinatura ativa para acessar o portal',
      });
    }

    // Criar sessão do portal
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const returnUrl = `${frontendUrl}/settings/subscription`;

    const portalSession = await createCustomerPortalSession(
      church.stripe_customer_id,
      returnUrl
    );

    res.json({
      url: portalSession.url,
    });
  } catch (error: any) {
    console.error('Erro ao criar portal session:', error);
    const errorResponse = formatErrorResponse(error, 'Erro ao criar sessão do portal');
    res.status(500).json(errorResponse);
  }
};

/**
 * Verifica se um evento do Stripe já foi processado
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('processed_webhook_events')
      .select('id')
      .eq('stripe_event_id', eventId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erro ao verificar evento processado:', error);
      return false; // Em caso de erro, processar para não perder evento
    }

    return !!data;
  } catch (error) {
    console.error('Erro ao verificar evento processado:', error);
    return false; // Em caso de erro, processar para não perder evento
  }
}

/**
 * Marca um evento como processado
 */
async function markEventAsProcessed(eventId: string, eventType: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('processed_webhook_events')
      .insert({
        stripe_event_id: eventId,
        event_type: eventType,
      });

    if (error) {
      // Se erro for de duplicação, ignorar (já foi processado)
      if (error.code === '23505') { // Unique violation
        console.log(`Evento ${eventId} já estava marcado como processado`);
        return;
      }
      console.error('Erro ao marcar evento como processado:', error);
    }
  } catch (error) {
    console.error('Erro ao marcar evento como processado:', error);
    // Não lançar erro para não falhar o webhook
  }
}

/**
 * Lista de IPs do Stripe para validação de webhooks
 * Fonte: https://stripe.com/docs/ips
 * Nota: Em produção, considerar usar range de IPs ou validação no nível de infraestrutura
 */
const STRIPE_WEBHOOK_IPS = [
  '3.18.12.63',
  '3.130.192.231',
  '13.235.14.237',
  '13.235.122.149',
  '18.211.135.69',
  '35.154.171.200',
  '52.15.183.88',
  '54.187.174.169',
  '54.187.205.235',
  '54.187.216.72',
  '54.241.31.99',
  '54.241.31.102',
  '54.241.34.107',
];

/**
 * Verifica se o IP de origem é válido (vem do Stripe)
 */
function isValidStripeIP(ip: string | undefined): boolean {
  if (!ip) {
    return false;
  }

  // Em desenvolvimento, permitir localhost
  if (process.env.NODE_ENV === 'development' && (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.0.0.1'))) {
    return true;
  }

  return STRIPE_WEBHOOK_IPS.includes(ip);
}

/**
 * Webhook do Stripe
 * POST /api/stripe/webhook
 */
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET não configurado');
    return res.status(500).json({ error: 'Webhook secret não configurado' });
  }

  // Validar IP de origem (segurança adicional)
  const clientIP = req.ip ||
    (req.socket.remoteAddress) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] as string;

  if (!isValidStripeIP(clientIP)) {
    warn('Webhook recebido de IP não autorizado', {
      clientIP,
      endpoint: '/stripe/webhook',
    });
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'IP não autorizado' });
    }
  }

  let event: any;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: any) {
    console.error('❌ Erro ao verificar webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Verificar se evento já foi processado (idempotência)
  if (await isEventProcessed(event.id)) {
    debug(`Evento ${event.id} (${event.type}) já foi processado, ignorando`, {
      stripeEventId: event.id,
      stripeEventType: event.type,
    });
    return res.json({ received: true, skipped: true });
  }

  try {
    // Processar evento
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        warn(`Evento não tratado: ${event.type}`, {
          stripeEventId: event.id,
          stripeEventType: event.type,
        });
    }

    // Marcar evento como processado após sucesso
    await markEventAsProcessed(event.id, event.type);
    // Log de evento Stripe processado
    debug(`Evento Stripe processado: ${event.type}`, {
      stripeEventId: event.id,
      processed: true,
    });

    res.json({ received: true });
  } catch (error: any) {
    console.error('❌ Erro ao processar webhook:', error);
    error('Erro ao processar webhook', {
      stripeEventId: event?.id,
      stripeEventType: event?.type,
      error: error as Error,
    });
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
};

/**
 * Função auxiliar para buscar o email do usuário a partir do user_id da igreja
 */
async function getUserEmailFromChurch(churchId: string): Promise<string | null> {
  try {
    // Buscar user_id da igreja
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('user_id')
      .eq('id', churchId)
      .single();

    if (churchError || !church || !church.user_id) {
      console.error('Erro ao buscar user_id da igreja:', churchError);
      return null;
    }

    // Buscar email do usuário através do user_id
    if (!supabaseAdmin) {
      console.error('supabaseAdmin não configurado');
      return null;
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(church.user_id);

    if (userError || !user || !user.email) {
      console.error('Erro ao buscar email do usuário:', userError);
      return null;
    }

    return user.email;
  } catch (error) {
    console.error('Erro ao buscar email do usuário:', error);
    return null;
  }
}

/**
 * Formata data para exibição em português brasileiro
 */
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Handler para checkout completado
 */
async function handleCheckoutCompleted(session: any) {
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const plan = session.metadata?.plan;

  if (!customerId || !subscriptionId) {
    console.error('Dados incompletos no checkout:', session);
    return;
  }

  // Buscar assinatura para obter mais detalhes
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;

  // Determinar tipo de plano baseado no price_id
  const planType = Object.entries(STRIPE_PRICE_IDS).find(
    ([_, id]) => id === priceId
  )?.[0] || plan || null;

  // Acessar propriedades com type assertion (Stripe SDK pode ter tipos incompletos)
  const sub = subscription as any;
  const currentPeriodStart = sub.current_period_start as number | null;
  const cancelAt = sub.cancel_at as number | null;

  // Buscar igreja pelo customer_id ou metadata
  const churchId = session.metadata?.church_id;
  const customerEmail = session.metadata?.customer_email || session.customer_email;

  if (churchId && churchId !== 'pending') {
    // Igreja existe, vincular diretamente
    const { data: church } = await supabase
      .from('churches')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: subscription.status,
        plan_type: planType,
        subscription_start_date: currentPeriodStart
          ? new Date(currentPeriodStart * 1000).toISOString()
          : null,
        subscription_end_date: cancelAt
          ? new Date(cancelAt * 1000).toISOString()
          : null,
      })
      .eq('id', churchId)
      .select('name')
      .single();

    // Buscar email do usuário e enviar email de confirmação de pagamento
    if (church) {
      const userEmail = await getUserEmailFromChurch(churchId);
      if (userEmail) {
        const planConfig = getPlanConfig(planType);
        const planName = planConfig?.name || `Plano ${planType}`;
        const amount = planConfig?.priceFormatted || 'N/A';
        const currentPeriodEnd = (subscription as any).current_period_end as number | null;
        const nextBillingDate = currentPeriodEnd
          ? formatDate(new Date(currentPeriodEnd * 1000))
          : undefined;

        await sendEmail({
          to: userEmail,
          subject: 'Pagamento Confirmado - Flock',
          html: getPaymentSuccessTemplate({
            churchName: church.name,
            planName,
            amount,
            nextBillingDate,
          }),
        });
      }
    }
  } else {
    // Tentar buscar igreja por customer_id (caso já exista)
    const { data: existingChurch } = await supabase
      .from('churches')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (existingChurch) {
      // Igreja encontrada por customer_id, vincular
      const { data: church } = await supabase
        .from('churches')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: subscription.status,
          plan_type: planType,
          subscription_start_date: currentPeriodStart
            ? new Date(currentPeriodStart * 1000).toISOString()
            : null,
          subscription_end_date: cancelAt
            ? new Date(cancelAt * 1000).toISOString()
            : null,
        })
        .eq('id', existingChurch.id)
        .select('name')
        .single();

      // Buscar email do usuário e enviar email de confirmação de pagamento
      if (church) {
        const userEmail = await getUserEmailFromChurch(existingChurch.id);
        if (userEmail) {
          const planConfig = getPlanConfig(planType);
          const planName = planConfig?.name || `Plano ${planType}`;
          const amount = planConfig?.priceFormatted || 'N/A';
          const currentPeriodEnd = (subscription as any).current_period_end as number | null;
          const nextBillingDate = currentPeriodEnd
            ? formatDate(new Date(currentPeriodEnd * 1000))
            : undefined;

          await sendEmail({
            to: userEmail,
            subject: 'Pagamento Confirmado - Flock',
            html: getPaymentSuccessTemplate({
              churchName: church.name,
              planName,
              amount,
              nextBillingDate,
            }),
          });
        }
      }
    } else if (customerEmail) {
      // Igreja não existe, salvar como assinatura pendente vinculada ao email
      await supabase
        .from('pending_subscriptions')
        .insert({
          email: customerEmail,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan_type: planType,
          subscription_status: subscription.status,
          subscription_start_date: currentPeriodStart
            ? new Date(currentPeriodStart * 1000).toISOString()
            : null,
        });
    } else {
      warn('Não foi possível vincular assinatura: email não encontrado', {
        customerEmail,
        stripeSubscriptionId: subscription.id,
      });
    }
  }
}

/**
 * Determina se uma assinatura cancelada deve resultar em plano gratuito
 * @param status Status da assinatura
 * @param endDate Data de término da assinatura (ou null)
 * @returns true se deve ser alterado para plano gratuito
 */
function shouldSetToFreePlan(
  status: string,
  endDate: Date | null
): boolean {
  if (status !== 'canceled') {
    return false;
  }

  if (!endDate) {
    // Se cancelada mas sem data de término, considerar expirada
    return true;
  }

  // Se data de término está no passado, está expirada
  return endDate < new Date();
}

/**
 * Extrai a data de término de uma assinatura do Stripe
 */
function getSubscriptionEndDate(subscription: any): Date | null {
  const cancelAt = subscription.cancel_at as number | null;
  const canceledAt = subscription.canceled_at as number | null;
  const currentPeriodEnd = subscription.current_period_end as number | null;

  if (cancelAt) {
    return new Date(cancelAt * 1000);
  }
  if (canceledAt) {
    return new Date(canceledAt * 1000);
  }
  if (currentPeriodEnd) {
    return new Date(currentPeriodEnd * 1000);
  }
  return null;
}

/**
 * Handler para assinatura atualizada
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id || subscription.customer;

    if (!customerId) {
      console.error('❌ customerId não encontrado');
      return;
    }

    const subscriptionId = subscription.id;
    const priceId = subscription.items.data[0].price.id;

    // Determinar tipo de plano
    const planType = Object.entries(STRIPE_PRICE_IDS).find(
      ([_, id]) => id === priceId
    )?.[0] || null;

    // Acessar propriedades com type assertion para evitar erros de tipo
    const currentPeriodStart = (subscription as any).current_period_start as number;
    const endDate = getSubscriptionEndDate(subscription);

    // Verificar se deve alterar para plano gratuito
    const finalPlanType = shouldSetToFreePlan(subscription.status, endDate)
      ? '100'
      : planType;

    // Buscar status anterior da igreja ANTES de atualizar para detectar reativação
    const { data: churchBeforeUpdate } = await supabase
      .from('churches')
      .select('id, name, subscription_status, plan_type, subscription_end_date, stripe_subscription_id')
      .eq('stripe_customer_id', customerId)
      .single();

    // Atualizar igreja
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .update({
        stripe_subscription_id: subscriptionId,
        subscription_status: subscription.status,
        plan_type: finalPlanType,
        subscription_start_date: currentPeriodStart
          ? new Date(currentPeriodStart * 1000).toISOString()
          : null,
        subscription_end_date: endDate ? endDate.toISOString() : null,
      })
      .eq('stripe_customer_id', customerId)
      .select('id, name')
      .single();

    if (!church || churchError) {
      return;
    }

    // Verificar se a assinatura foi reativada após cancelamento
    // Condições para reativação:
    // 1. Status atual é 'active'
    // 2. cancel_at_period_end é false (foi removido o cancelamento)
    // 3. Havia uma assinatura anterior que estava cancelada/expirada
    const isNowActive = subscription.status === 'active';
    const cancelAtPeriodEnd = (subscription as any).cancel_at_period_end === false;

    // Verificar se realmente havia uma assinatura anterior cancelada/expirada
    // NÃO considerar null como cancelado, pois null pode significar "nunca teve assinatura"
    const hadPreviousSubscription = churchBeforeUpdate?.stripe_subscription_id !== null &&
      churchBeforeUpdate?.stripe_subscription_id !== undefined;

    const wasCanceled = hadPreviousSubscription && (
      churchBeforeUpdate?.subscription_status === 'canceled' ||
      (churchBeforeUpdate?.subscription_end_date !== null &&
        churchBeforeUpdate?.subscription_end_date !== undefined &&
        new Date(churchBeforeUpdate.subscription_end_date) < new Date())
    );

    const isReactivated = isNowActive && cancelAtPeriodEnd && wasCanceled;

    // Se a assinatura foi reativada, enviar email de reativação
    if (isReactivated) {
      const userEmail = await getUserEmailFromChurch(church.id);

      if (userEmail) {
        const planConfig = getPlanConfig(planType);
        const planName = planConfig?.name || `Plano ${planType || 'anterior'}`;
        const amount = planConfig?.priceFormatted || 'N/A';
        const currentPeriodEnd = (subscription as any).current_period_end as number | null;
        const nextBillingDate = currentPeriodEnd
          ? formatDate(new Date(currentPeriodEnd * 1000))
          : formatDate(new Date());

        await sendEmail({
          to: userEmail,
          subject: 'Assinatura Reativada - Flock',
          html: getSubscriptionReactivatedTemplate({
            churchName: church.name,
            planName,
            amount,
            nextBillingDate,
          }),
        });

        console.log('✅ Email de reativação enviado para:', userEmail);
        return; // Não processar cancelamento se foi reativação
      }
    }

    // Se a assinatura foi cancelada, enviar email de cancelamento
    // Verificar se foi cancelada: status 'canceled' OU cancel_at_period_end OU canceled_at
    const isCanceled = subscription.status === 'canceled' ||
      (subscription as any).cancel_at_period_end === true ||
      (subscription as any).canceled_at !== null ||
      (subscription as any).cancel_at !== null;

    if (isCanceled) {
      const userEmail = await getUserEmailFromChurch(church.id);

      if (userEmail) {
        const planConfig = getPlanConfig(planType);
        const planName = planConfig?.name || `Plano ${planType || 'anterior'}`;
        const endDateFormatted = endDate ? formatDate(endDate) : 'N/A';

        await sendEmail({
          to: userEmail,
          subject: 'Assinatura Cancelada - Flock',
          html: getSubscriptionCanceledTemplate({
            churchName: church.name,
            planName,
            endDate: endDateFormatted,
          }),
        });

        console.log('✅ Email de cancelamento enviado para:', userEmail);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao processar atualização de assinatura:', error);
  }
}

/**
 * Handler para assinatura cancelada
 */
async function handleSubscriptionDeleted(subscription: any) {
  try {
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id || subscription.customer;

    if (!customerId) {
      console.error('❌ customerId não encontrado no evento de assinatura deletada');
      return;
    }

    const endDate = getSubscriptionEndDate(subscription) || new Date();

    // Buscar informações do plano antes de atualizar
    const priceId = subscription.items?.data?.[0]?.price?.id;
    const planType = priceId
      ? Object.entries(STRIPE_PRICE_IDS).find(([_, id]) => id === priceId)?.[0] || null
      : null;

    // Quando a assinatura é deletada, sempre alterar para plano gratuito
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .update({
        subscription_status: 'canceled',
        subscription_end_date: endDate.toISOString(),
        plan_type: '100', // Plano gratuito quando cancelada
      })
      .eq('stripe_customer_id', customerId)
      .select('id, name')
      .single();

    if (churchError || !church) {
      if (churchError) {
        console.error('❌ Erro ao buscar igreja para cancelamento:', churchError);
      }
      return;
    }

    // Buscar email do usuário e enviar email de assinatura cancelada
    const userEmail = await getUserEmailFromChurch(church.id);

    if (userEmail) {
      const planConfig = getPlanConfig(planType);
      const planName = planConfig?.name || `Plano ${planType || 'anterior'}`;
      const endDateFormatted = formatDate(endDate);

      await sendEmail({
        to: userEmail,
        subject: 'Assinatura Cancelada - Flock',
        html: getSubscriptionCanceledTemplate({
          churchName: church.name,
          planName,
          endDate: endDateFormatted,
        }),
      });

      console.log('✅ Email de cancelamento enviado para:', userEmail);
    }
  } catch (error) {
    console.error('❌ Erro ao processar cancelamento de assinatura:', error);
  }
}

/**
 * Handler para pagamento bem-sucedido
 */
async function handlePaymentSucceeded(invoice: any) {
  try {
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id || invoice.customer;
    const subscriptionId = invoice.subscription;

    if (!customerId || !subscriptionId) {
      return;
    }

    // Buscar assinatura para obter informações do plano
    const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
    const priceId = subscription.items.data[0].price.id;
    const planType = Object.entries(STRIPE_PRICE_IDS).find(
      ([_, id]) => id === priceId
    )?.[0] || null;

    // Atualizar data de renovação
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .update({
        subscription_status: 'active',
      })
      .eq('stripe_customer_id', customerId)
      .select('id, name')
      .single();

    if (churchError || !church) {
      return;
    }

    // Buscar email do usuário e enviar email de renovação bem-sucedida
    const userEmail = await getUserEmailFromChurch(church.id);

    if (userEmail) {
      const planConfig = getPlanConfig(planType);
      const planName = planConfig?.name || `Plano ${planType}`;
      const amount = planConfig?.priceFormatted || 'N/A';
      const currentPeriodEnd = (subscription as any).current_period_end as number | null;
      const nextBillingDate = currentPeriodEnd
        ? formatDate(new Date(currentPeriodEnd * 1000))
        : formatDate(new Date());

      await sendEmail({
        to: userEmail,
        subject: 'Renovação Confirmada - Flock',
        html: getRenewalSuccessTemplate({
          churchName: church.name,
          planName,
          amount,
          nextBillingDate,
        }),
      });

      console.log('✅ Email de renovação enviado para:', userEmail);
    }
  } catch (error) {
    console.error('❌ Erro ao processar pagamento bem-sucedido:', error);
  }
}

/**
 * Handler para pagamento falhado
 */
async function handlePaymentFailed(invoice: any) {
  try {
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id || invoice.customer;
    const subscriptionId = invoice.subscription;

    if (!customerId || !subscriptionId) {
      return;
    }

    // Buscar assinatura para obter informações do plano
    const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
    const priceId = subscription.items.data[0].price.id;
    const planType = Object.entries(STRIPE_PRICE_IDS).find(
      ([_, id]) => id === priceId
    )?.[0] || null;

    // Atualizar status para past_due
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .update({
        subscription_status: 'past_due',
      })
      .eq('stripe_customer_id', customerId)
      .select('id, name')
      .single();

    if (churchError || !church) {
      return;
    }

    // Buscar email do usuário e enviar email de pagamento falhado
    const userEmail = await getUserEmailFromChurch(church.id);

    if (userEmail) {
      const planConfig = getPlanConfig(planType);
      const planName = planConfig?.name || `Plano ${planType}`;
      const amount = planConfig?.priceFormatted || 'N/A';
      const retryDate = invoice.next_payment_attempt
        ? formatDate(new Date(invoice.next_payment_attempt * 1000))
        : undefined;

      await sendEmail({
        to: userEmail,
        subject: 'Pagamento Não Processado - Flock',
        html: getPaymentFailedTemplate({
          churchName: church.name,
          planName,
          amount,
          retryDate,
        }),
      });

      console.log('✅ Email de pagamento falhado enviado para:', userEmail);
    }
  } catch (error) {
    console.error('❌ Erro ao processar pagamento falhado:', error);
  }
}

/**
 * Sincronizar assinatura do Stripe com o banco de dados
 * POST /api/stripe/sync-subscription
 */
export const syncSubscription = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autenticado',
        details: 'É necessário estar autenticado para sincronizar assinatura',
      });
    }

    // Buscar igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, stripe_customer_id, stripe_subscription_id')
      .eq('id', req.church!.churchId)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Usuário não possui igreja cadastrada',
      });
    }

    if (!church.stripe_customer_id) {
      return res.status(400).json({
        error: 'Cliente não possui customer_id',
        details: 'Não foi possível encontrar o customer_id do Stripe para esta conta',
      });
    }

    // Buscar assinaturas do cliente no Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: church.stripe_customer_id,
      status: 'all',
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      // Nenhuma assinatura encontrada, alterar para plano gratuito
      await supabase
        .from('churches')
        .update({
          stripe_subscription_id: null,
          subscription_status: null,
          plan_type: '100', // Plano gratuito quando não há assinatura
          subscription_start_date: null,
          subscription_end_date: null,
        })
        .eq('id', church.id);

      return res.json({
        message: 'Nenhuma assinatura encontrada no Stripe',
        synced: false,
      });
    }

    // Filtrar assinaturas ativas primeiro (prioridade: active, trialing, past_due)
    const activeSubscriptions = subscriptions.data.filter(
      sub => ['active', 'trialing', 'past_due'].includes(sub.status)
    );

    let subscription: Stripe.Subscription;

    if (activeSubscriptions.length > 0) {
      // Ordenar por data de criação (mais recente primeiro)
      activeSubscriptions.sort((a, b) =>
        (b.created as number) - (a.created as number)
      );
      subscription = activeSubscriptions[0];

      if (activeSubscriptions.length > 1) {
        console.warn(
          `⚠️ Múltiplas assinaturas ativas encontradas para customer ${church.stripe_customer_id}. Usando a mais recente (${subscription.id}).`
        );
      }
    } else {
      // Se não há ativas, usar a primeira (cancelada/expirada)
      // Ordenar por data de criação (mais recente primeiro)
      subscriptions.data.sort((a, b) =>
        (b.created as number) - (a.created as number)
      );
      subscription = subscriptions.data[0];
      console.log(
        `ℹ️ Nenhuma assinatura ativa encontrada para customer ${church.stripe_customer_id}. Usando a mais recente (${subscription.id}, status: ${subscription.status}).`
      );
    }
    const subscriptionId = subscription.id;
    const priceId = subscription.items.data[0].price.id;

    // Determinar tipo de plano baseado no price_id
    const planType = Object.entries(STRIPE_PRICE_IDS).find(
      ([_, id]) => id === priceId
    )?.[0] || null;

    // Acessar propriedades com type assertion
    const sub = subscription as any;
    const currentPeriodStart = sub.current_period_start as number | null;
    const endDate = getSubscriptionEndDate(subscription);

    // Verificar se deve alterar para plano gratuito (usando função unificada)
    const finalPlanType = shouldSetToFreePlan(subscription.status, endDate)
      ? '100'
      : planType;

    // Atualizar dados da igreja
    const { error: updateError } = await supabase
      .from('churches')
      .update({
        stripe_subscription_id: subscriptionId,
        subscription_status: subscription.status,
        plan_type: finalPlanType,
        subscription_start_date: currentPeriodStart
          ? new Date(currentPeriodStart * 1000).toISOString()
          : null,
        subscription_end_date: endDate ? endDate.toISOString() : null,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', church.id);

    if (updateError) {
      console.error('Erro ao atualizar assinatura:', updateError);
      return res.status(500).json({
        error: 'Erro ao atualizar assinatura',
        details: updateError.message,
      });
    }

    res.json({
      message: 'Assinatura sincronizada com sucesso',
      synced: true,
      subscription: {
        id: subscriptionId,
        status: subscription.status,
        plan_type: finalPlanType,
        start_date: currentPeriodStart ? new Date(currentPeriodStart * 1000).toISOString() : null,
        end_date: endDate ? endDate.toISOString() : null,
      },
    });
  } catch (error: any) {
    console.error('Erro ao sincronizar assinatura:', error);
    const errorResponse = formatErrorResponse(error, 'Erro ao sincronizar assinatura');
    res.status(500).json(errorResponse);
  }
};

/**
 * Trocar plano da assinatura
 * POST /api/stripe/change-plan
 */
export const changePlan = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autenticado',
        details: 'É necessário estar autenticado para trocar de plano',
      });
    }

    const { plan } = req.body;

    // Validar plano
    if (!plan || !['200', '500', '800'].includes(plan)) {
      return res.status(400).json({
        error: 'Plano inválido',
        details: 'Plano deve ser: 200, 500 ou 800',
      });
    }

    // Obter price_id do novo plano
    const newPriceId = STRIPE_PRICE_IDS[plan as keyof typeof STRIPE_PRICE_IDS];
    if (!newPriceId) {
      return res.status(500).json({
        error: 'Plano não configurado',
        details: `Price ID para o plano ${plan} não está configurado`,
      });
    }

    // Buscar igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, stripe_customer_id, stripe_subscription_id, plan_type')
      .eq('id', req.church!.churchId)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Usuário não possui igreja cadastrada',
      });
    }

    if (!church.stripe_subscription_id) {
      return res.status(400).json({
        error: 'Nenhuma assinatura encontrada',
        details: 'Você precisa ter uma assinatura ativa para trocar de plano',
      });
    }

    // Verificar se já está no mesmo plano
    if (church.plan_type === plan) {
      return res.status(400).json({
        error: 'Plano já ativo',
        details: `Você já está no plano ${plan}`,
      });
    }

    // Validar limite de membros antes de fazer downgrade
    const { checkMemberLimit } = require('../utils/planLimits');
    const PLAN_LIMITS: Record<string, number> = {
      '100': 100,
      '200': 200,
      '500': 500,
      '800': 800,
    };

    const currentLimitCheck = await checkMemberLimit(church.id, 0);
    const newLimit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
    const currentLimit = PLAN_LIMITS[church.plan_type as keyof typeof PLAN_LIMITS] || Infinity;

    // Se está fazendo downgrade (novo limite menor que o atual) e tem mais membros que o novo limite permite
    if (newLimit < currentLimit && currentLimitCheck.currentCount > newLimit) {
      const membersToRemove = currentLimitCheck.currentCount - newLimit;
      return res.status(400).json({
        error: 'Não é possível fazer downgrade',
        details: `Você possui ${currentLimitCheck.currentCount} membros, mas o plano ${plan} permite apenas ${newLimit} membros. Remova ${membersToRemove} membro(s) antes de fazer o downgrade.`,
        currentCount: currentLimitCheck.currentCount,
        currentLimit,
        newLimit,
        membersToRemove,
      });
    }

    // Atualizar assinatura no Stripe
    const updatedSubscription = await updateSubscription(
      church.stripe_subscription_id,
      newPriceId
    );

    // Determinar tipo de plano
    const planType = Object.entries(STRIPE_PRICE_IDS).find(
      ([_, id]) => id === newPriceId
    )?.[0] || null;

    // Atualizar banco de dados (o webhook também atualizará, mas fazemos aqui para resposta imediata)
    const sub = updatedSubscription as any;
    const currentPeriodStart = sub.current_period_start as number | null;
    const cancelAt = sub.cancel_at as number | null;
    const canceledAt = sub.canceled_at as number | null;

    await supabase
      .from('churches')
      .update({
        plan_type: planType,
        subscription_status: updatedSubscription.status,
        subscription_start_date: currentPeriodStart
          ? new Date(currentPeriodStart * 1000).toISOString()
          : null,
        subscription_end_date: cancelAt
          ? new Date(cancelAt * 1000).toISOString()
          : canceledAt
            ? new Date(canceledAt * 1000).toISOString()
            : null,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', church.id);

    // Buscar informações completas da igreja para o email
    const { data: churchData } = await supabase
      .from('churches')
      .select('name')
      .eq('id', church.id)
      .single();

    // Buscar email do usuário e enviar email de confirmação (não bloquear o fluxo se der erro)
    if (churchData) {
      try {
        const userEmail = await getUserEmailFromChurch(church.id);
        if (userEmail) {
          const oldPlanConfig = getPlanConfig(church.plan_type);
          const newPlanConfig = getPlanConfig(planType);
          const oldPlanName = oldPlanConfig?.name || `Plano ${church.plan_type || 'N/A'}`;
          const newPlanName = newPlanConfig?.name || `Plano ${planType || 'N/A'}`;
          const newPlanPrice = newPlanConfig?.priceFormatted || 'N/A';

          // Determinar se é upgrade ou downgrade
          const oldPlanMembers = oldPlanConfig?.members || 0;
          const newPlanMembers = newPlanConfig?.members || 0;
          const isUpgrade = newPlanMembers > oldPlanMembers;
          const isDowngrade = newPlanMembers < oldPlanMembers;

          // Obter próxima data de cobrança
          const currentPeriodEnd = (updatedSubscription as any).current_period_end as number | null;
          const nextBillingDate = currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000).toLocaleDateString('pt-BR', {
              dateStyle: 'long',
              timeZone: 'America/Sao_Paulo'
            })
            : undefined;

          const userName = churchData.name || userEmail.split('@')[0] || 'Usuário';
          const changeDate = new Date().toLocaleDateString('pt-BR', {
            dateStyle: 'long',
            timeZone: 'America/Sao_Paulo'
          });

          await sendEmail({
            to: userEmail,
            subject: 'Plano Alterado - Flock',
            html: getPlanChangedTemplate({
              userName,
              oldPlanName,
              newPlanName,
              newPlanPrice,
              nextBillingDate,
              isUpgrade,
              isDowngrade,
            }),
          });
        }
      } catch (emailError) {
        // Logar erro mas não quebrar o fluxo de troca de plano
        console.error('Erro ao enviar email de confirmação de troca de plano:', emailError);
      }
    }

    res.json({
      message: 'Plano alterado com sucesso',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        plan_type: planType,
      },
    });
  } catch (error: any) {
    console.error('Erro ao trocar plano:', error);
    const errorResponse = formatErrorResponse(error, 'Erro ao trocar plano');
    res.status(500).json(errorResponse);
  }
};

/**
 * Health check do Stripe
 * GET /health/stripe
 */
export const checkStripeHealth = async (req: Request, res: Response) => {
  try {
    // Verificar se consegue listar customers (operação leve)
    await stripe.customers.list({ limit: 1 });

    res.json({
      status: 'healthy',
      stripe: {
        connected: true,
        apiVersion: '2025-11-17.clover', // Versão configurada no stripe.ts
      },
      config: {
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        hasPriceIds: {
          m200: !!process.env.STRIPE_PRICE_ID_M200,
          m500: !!process.env.STRIPE_PRICE_ID_M500,
          m800: !!process.env.STRIPE_PRICE_ID_M800,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erro no health check do Stripe:', error);
    res.status(503).json({
      status: 'unhealthy',
      stripe: {
        connected: false,
        error: error.message,
      },
      config: {
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        hasPriceIds: {
          m200: !!process.env.STRIPE_PRICE_ID_M200,
          m500: !!process.env.STRIPE_PRICE_ID_M500,
          m800: !!process.env.STRIPE_PRICE_ID_M800,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Verificar status de checkout session
 * GET /api/stripe/checkout-status?session_id=xxx
 */
export const checkCheckoutStatus = async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.query.session_id as string;

    if (!sessionId) {
      return res.status(400).json({
        error: 'session_id é obrigatório',
        details: 'Forneça o session_id na query string',
      });
    }

    // Buscar sessão no Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({
        confirmed: false,
        error: 'Sessão não encontrada',
      });
    }

    // Verificar se o pagamento foi concluído
    if (session.payment_status !== 'paid') {
      return res.json({
        confirmed: false,
        payment_status: session.payment_status,
        message: 'Pagamento ainda não foi processado',
      });
    }

    // Verificar se há subscription_id
    if (!session.subscription) {
      return res.json({
        confirmed: false,
        payment_status: session.payment_status,
        message: 'Assinatura ainda não foi criada',
      });
    }

    // Buscar assinatura no banco de dados para confirmar que foi processada
    const { data: church } = await supabase
      .from('churches')
      .select('id, stripe_subscription_id, plan_type, subscription_status')
      .eq('stripe_subscription_id', session.subscription as string)
      .single();

    if (church && church.subscription_status === 'active') {
      return res.json({
        confirmed: true,
        payment_status: session.payment_status,
        subscription_id: session.subscription,
        plan_type: church.plan_type,
        subscription_status: church.subscription_status,
      });
    }

    // Se pagamento foi pago mas ainda não processado no banco
    return res.json({
      confirmed: false,
      payment_status: session.payment_status,
      subscription_id: session.subscription,
      message: 'Pagamento confirmado, aguardando processamento...',
    });
  } catch (error: any) {
    console.error('Erro ao verificar status do checkout:', error);
    const errorResponse = formatErrorResponse(error, 'Erro ao verificar status do checkout');
    res.status(500).json({
      confirmed: false,
      ...errorResponse,
    });
  }
};

/**
 * Ativar plano gratuito (100 membros)
 * POST /api/stripe/activate-free-plan
 */
export const activateFreePlan = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autenticado',
        details: 'É necessário estar autenticado para ativar o plano gratuito',
      });
    }

    // Buscar igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, plan_type')
      .eq('id', req.church!.churchId)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Usuário não possui igreja cadastrada',
      });
    }

    // ACHADO 09: retornar 200 quando plano já está ativo — comportamento idempotente.
    // Antes retornava 400, fazendo o frontend tratar como erro de formulário.
    if (church.plan_type === '100') {
      return res.json({
        message: 'Plano gratuito já está ativo',
        plan_type: '100',
      });
    }

    // Atualizar igreja com plano gratuito
    const { error: updateError } = await supabase
      .from('churches')
      .update({
        plan_type: '100',
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', church.id);

    if (updateError) {
      console.error('Erro ao atualizar plano gratuito:', updateError);
      console.error('Detalhes do erro:', JSON.stringify(updateError, null, 2));
      return res.status(500).json({
        error: 'Erro ao ativar plano gratuito',
        details: process.env.NODE_ENV === 'development'
          ? `Erro do banco de dados: ${updateError.message || JSON.stringify(updateError)}`
          : 'Não foi possível atualizar o plano. Verifique se o plano gratuito está habilitado no banco de dados.',
      });
    }

    res.json({
      message: 'Plano gratuito ativado com sucesso',
      plan_type: '100',
    });
  } catch (error: any) {
    console.error('Erro ao ativar plano gratuito:', error);
    const errorResponse = formatErrorResponse(error, 'Erro ao ativar plano gratuito');
    res.status(500).json(errorResponse);
  }
};


import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe, STRIPE_PRICE_IDS, getOrCreateCustomer, createCheckoutSession, createCustomerPortalSession, updateSubscription } from '../services/stripe';
import supabase from '../services/supabase';
import { AuthRequest } from '../types';
import { formatErrorResponse, getFriendlyErrorMessage } from '../utils/errorMessages';
import { PLAN_CONFIG, getPlanConfig, getAllPlans } from '../config/plans';
import { logger, logStripeEvent, logStripeOperation, logSubscriptionChange, logPaymentFlow } from '../utils/logger';

/**
 * Criar sessão de checkout
 * POST /api/stripe/create-checkout-session
 */
export const createCheckout = async (req: AuthRequest, res: Response) => {
  try {
    const { plan } = req.body;

    console.log('📦 Criando checkout session:', {
      plan,
      user: req.user ? { id: req.user.id, email: req.user.email } : 'não autenticado',
    });

    // Validar plano (100 não precisa de checkout, é gratuito)
    if (!plan || !['200', '500', '800', 'custom'].includes(plan)) {
      return res.status(400).json({
        error: 'Plano inválido',
        details: 'Plano deve ser: 200, 500, 800 ou custom',
      });
    }

    // Obter price_id do plano
    const priceId = STRIPE_PRICE_IDS[plan as keyof typeof STRIPE_PRICE_IDS];
    if (!priceId) {
      logger.error(`Price ID não configurado para o plano: ${plan}`, undefined, {
        userId: req.user?.id,
        planType: plan,
      });
      return res.status(500).json({
        error: 'Plano não configurado',
        details: `Price ID para o plano ${plan} não está configurado. Verifique as variáveis de ambiente STRIPE_PRICE_ID_${plan}`,
      });
    }

    logger.debug(`Price ID encontrado para plano ${plan}: ${priceId}`, {
      planType: plan,
      stripePriceId: priceId,
    });

    // Debug: verificar autenticação
    console.log('🔐 Status de autenticação:', {
      hasUser: !!req.user,
      userId: req.user?.id,
      userEmail: req.user?.email,
      hasCookies: !!req.cookies,
      cookieNames: req.cookies ? Object.keys(req.cookies) : [],
    });

    // Tentar autenticar novamente se não estiver autenticado mas houver cookies
    if (!req.user && req.cookies) {
      const { cookieConfig } = require('../utils/cookieUtils');
      const accessToken = req.cookies[cookieConfig.names.accessToken];
      
      if (accessToken) {
        console.log('🔄 Tentando autenticar com token do cookie...');
        try {
          const { data: { user }, error } = await supabase.auth.getUser(accessToken);
          if (!error && user) {
            req.user = {
              id: user.id,
              email: user.email || ''
            };
            console.log('✅ Autenticação bem-sucedida via token do cookie');
          } else if (error) {
            console.log('⚠️ Erro ao validar token:', error.message);
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
                console.log('✅ Token renovado e usuário autenticado');
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

    if (req.user) {
      console.log('✅ Usuário autenticado, buscando dados da igreja...');
      // Buscar igreja do usuário
      const { data: church, error: churchError } = await supabase
        .from('churches')
        .select('id, name, email_church, user_id, stripe_customer_id')
        .eq('user_id', req.user.id)
        .single();

      if (churchError || !church) {
        return res.status(404).json({
          error: 'Igreja não encontrada',
          details: 'Usuário não possui igreja cadastrada',
        });
      }

      churchId = church.id;
      customerEmail = church.email_church || req.user.email;
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
      console.log('⚠️ Usuário não autenticado, esperando email e nome no body');
      const { email, name, church_id } = req.body;

      if (!email || !name) {
        console.error('❌ Email e nome não fornecidos no body:', { email, name, body: req.body });
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
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
      .eq('user_id', req.user.id)
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
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
    console.error('STRIPE_WEBHOOK_SECRET não configurado');
    return res.status(500).json({ error: 'Webhook secret não configurado' });
  }

  // Validar IP de origem (segurança adicional)
  const clientIP = req.ip || 
    (req.socket.remoteAddress) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] as string;

  if (!isValidStripeIP(clientIP)) {
    logger.warn('Webhook recebido de IP não autorizado', {
      clientIP,
      endpoint: '/stripe/webhook',
    });
    // Em produção, pode querer bloquear completamente
    // Em desenvolvimento, apenas logar o aviso
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'IP não autorizado' });
    }
  }

  let event: any;

  try {
    // Verificar assinatura do webhook
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: any) {
    console.error('Erro ao verificar webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Verificar se evento já foi processado (idempotência)
  if (await isEventProcessed(event.id)) {
    logger.debug(`Evento ${event.id} (${event.type}) já foi processado, ignorando`, {
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
        logger.warn(`Evento não tratado: ${event.type}`, {
          stripeEventId: event.id,
          stripeEventType: event.type,
        });
    }

    // Marcar evento como processado após sucesso
    await markEventAsProcessed(event.id, event.type);
    logStripeEvent(event.type, event.id, {
      processed: true,
    });

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Erro ao processar webhook', error as Error, {
      stripeEventId: event?.id,
      stripeEventType: event?.type,
    });
    // Não marcar como processado em caso de erro para permitir retry
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
};

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
  )?.[0] || plan || 'custom';

  // Acessar propriedades com type assertion (Stripe SDK pode ter tipos incompletos)
  const sub = subscription as any;
  const currentPeriodStart = sub.current_period_start as number | null;
  const cancelAt = sub.cancel_at as number | null;

  // Buscar igreja pelo customer_id ou metadata
  const churchId = session.metadata?.church_id;
  const customerEmail = session.metadata?.customer_email || session.customer_email;

  if (churchId && churchId !== 'pending') {
    // Igreja existe, vincular diretamente
    await supabase
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
      .eq('id', churchId);
  } else {
    // Tentar buscar igreja por customer_id (caso já exista)
    const { data: existingChurch } = await supabase
      .from('churches')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (existingChurch) {
      // Igreja encontrada por customer_id, vincular
      await supabase
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
        .eq('id', existingChurch.id);
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
      
      console.log(`✅ Assinatura pendente salva para email: ${customerEmail}`);
    } else {
      logger.warn('Não foi possível vincular assinatura: email não encontrado', {
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
  const customerId = subscription.customer;
  const subscriptionId = subscription.id;
  const priceId = subscription.items.data[0].price.id;

  // Determinar tipo de plano
  const planType = Object.entries(STRIPE_PRICE_IDS).find(
    ([_, id]) => id === priceId
  )?.[0] || 'custom';

  // Acessar propriedades com type assertion para evitar erros de tipo
  const currentPeriodStart = (subscription as any).current_period_start as number;
  const endDate = getSubscriptionEndDate(subscription);

  // Verificar se deve alterar para plano gratuito
  const finalPlanType = shouldSetToFreePlan(subscription.status, endDate)
    ? '100'
    : planType;

  // Atualizar igreja
  await supabase
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
    .eq('stripe_customer_id', customerId);
}

/**
 * Handler para assinatura cancelada
 */
async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer;
  const endDate = getSubscriptionEndDate(subscription) || new Date();

  // Quando a assinatura é deletada, sempre alterar para plano gratuito
  // (usando a função unificada para consistência)
  await supabase
    .from('churches')
    .update({
      subscription_status: 'canceled',
      subscription_end_date: endDate.toISOString(),
      plan_type: '100', // Plano gratuito quando cancelada
    })
    .eq('stripe_customer_id', customerId);
}

/**
 * Handler para pagamento bem-sucedido
 */
async function handlePaymentSucceeded(invoice: any) {
  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;

  if (subscriptionId) {
    // Atualizar data de renovação
    await supabase
      .from('churches')
      .update({
        subscription_status: 'active',
      })
      .eq('stripe_customer_id', customerId);
  }
}

/**
 * Handler para pagamento falhado
 */
async function handlePaymentFailed(invoice: any) {
  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;

  if (subscriptionId) {
    // Atualizar status para past_due
    await supabase
      .from('churches')
      .update({
        subscription_status: 'past_due',
      })
      .eq('stripe_customer_id', customerId);
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
      .eq('user_id', req.user.id)
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
    )?.[0] || 'custom';

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
      .eq('user_id', req.user.id)
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
    )?.[0] || 'custom';

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
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Usuário não possui igreja cadastrada',
      });
    }

    // Verificar se já está no plano gratuito
    if (church.plan_type === '100') {
      return res.status(400).json({
        error: 'Plano já ativo',
        details: 'Você já está no plano gratuito',
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


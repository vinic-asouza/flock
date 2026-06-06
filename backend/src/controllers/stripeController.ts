import { Request, Response } from 'express';
import crypto from 'crypto';
import Stripe from 'stripe';
import {
  stripe,
  STRIPE_PRICE_IDS,
  getOrCreateCustomerForChurch,
  createCheckoutSession,
  createCustomerPortalSession,
  updateSubscription,
} from '../services/stripe';
import { setPendingLinkToken } from '../utils/cookieUtils';
import { supabaseAdmin } from '../services/supabase';
import { insertSubscriptionEvent, processStripeWebhook, getUserEmailFromChurch, shouldSetToFreePlan, getSubscriptionEndDate } from '../services/stripeWebhookService';

// alias para legibilidade — todas as queries de DB usam service_role
const supabase = supabaseAdmin;
import { AuthRequest } from '../types';
import { formatErrorResponse, getFriendlyErrorMessage } from '../utils/errorMessages';
import { PLAN_CONFIG, getPlanConfig, getAllPlans, getPlanName, getPlanPrice } from '../config/plans';
import { error as logError, warn, debug } from '../utils/logger';
import { billingLog } from '../utils/structuredLogger';
import { recordCheckoutCreated, recordSyncSubscription } from '../utils/billingMetrics';
import { sendEmail } from '../services/emailService';
import { getPlanChangedTemplate } from '../templates/stripeEmailTemplates';
import { checkMemberLimit } from '../utils/planLimits';

/**
 * Criar sessão de checkout
 * POST /api/stripe/create-checkout-session
 */
export const createCheckout = async (req: AuthRequest, res: Response) => {
  try {
    const { plan } = req.body;

    if (!plan || !['200', '500', '800'].includes(plan)) {
      return res.status(400).json({
        error: 'Plano inválido',
        details: 'Plano deve ser: 200, 500 ou 800',
      });
    }

    const priceId = STRIPE_PRICE_IDS[plan as keyof typeof STRIPE_PRICE_IDS];
    if (!priceId) {
      logError(`Price ID não configurado para o plano: ${plan}`, {
        userId: req.user?.id,
        planType: plan,
      });
      return res.status(500).json({
        error: 'Plano não configurado',
        details: `Price ID para o plano ${plan} não está configurado. Verifique as variáveis de ambiente STRIPE_PRICE_ID_${plan}`,
      });
    }

    let customerId: string;
    let churchId: string;
    let customerEmail: string;
    let customerName: string;
    let linkToken: string | undefined;
    const landingUrl = process.env.LANDING_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

    if (req.user) {
      if (req.body.church_id) {
        return res.status(400).json({
          error: 'Parâmetro não permitido',
          details: 'church_id não pode ser enviado no checkout autenticado',
        });
      }

      const { data: church, error: churchError } = await supabase
        .from('churches')
        .select('id, name, stripe_subscription_id, subscription_status, plan_type')
        .eq('id', req.church!.churchId)
        .single();

      if (churchError || !church) {
        return res.status(404).json({
          error: 'Igreja não encontrada',
          details: 'Usuário não possui igreja cadastrada',
        });
      }

      const activeStatuses = ['active', 'trialing', 'past_due'];
      if (
        church.stripe_subscription_id &&
        activeStatuses.includes(church.subscription_status || '')
      ) {
        return res.status(409).json({
          error: 'Assinatura já ativa',
          details:
            'Sua igreja já possui uma assinatura ativa. Use Configurações → Plano para trocar de plano ou gerenciar no portal Stripe.',
        });
      }

      churchId = church.id;
      customerEmail = req.user.email!;
      customerName = church.name;

      const customer = await getOrCreateCustomerForChurch({
        churchId: church.id,
        email: customerEmail,
        name: customerName,
        userId: req.user.id,
      });
      customerId = customer.id;
    } else {
      if (req.body.church_id) {
        return res.status(400).json({
          error: 'Parâmetro não permitido',
          details: 'church_id não é aceito no checkout público',
        });
      }

      const { email, name } = req.body;
      if (!email || !name) {
        return res.status(400).json({
          error: 'Email e nome são obrigatórios',
          details: 'Para checkout não autenticado, informe email e nome',
        });
      }

      customerEmail = email;
      customerName = name;
      churchId = 'pending';
      linkToken = crypto.randomUUID();

      const customer = await getOrCreateCustomerForChurch({
        churchId: 'pending',
        email: customerEmail,
        name: customerName,
        linkToken,
      });
      customerId = customer.id;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const successUrl = req.user
      ? `${frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`
      : `${landingUrl}/register?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = req.user
      ? `${frontendUrl}/subscription/cancel`
      : `${landingUrl}/?checkout=cancel`;

    const metadata: Record<string, string> = {
      plan,
      church_id: churchId,
      customer_email: customerEmail,
    };
    if (linkToken) {
      metadata.link_token = linkToken;
    }

    const session = await createCheckoutSession(
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      metadata
    );

    if (linkToken) {
      setPendingLinkToken(res, linkToken);
    }

    billingLog({
      event: 'checkout_session_created',
      session_id: session.id,
      church_id: churchId !== 'pending' ? churchId : undefined,
      plan,
      authenticated: !!req.user,
      request_id: req.requestId,
    });
    recordCheckoutCreated(plan, !!req.user);

    res.json({
      session_id: session.id,
      url: session.url,
    });
  } catch (err: unknown) {
    logError('Erro ao criar checkout:', err);

    if (err && typeof err === 'object' && 'type' in err && (err as { type?: string }).type === 'StripeInvalidRequestError') {
      const stripeErr = err as { type?: string; message?: string; code?: string; param?: string };
      logError('Erro do Stripe:', {
        type: stripeErr.type,
        message: stripeErr.message,
        code: stripeErr.code,
        param: stripeErr.param,
      });
    }

    const errorResponse = formatErrorResponse(err, 'Erro ao criar sessão de checkout');
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
    const returnUrl = `${frontendUrl}/settings?tab=payment`;

    const portalSession = await createCustomerPortalSession(
      church.stripe_customer_id,
      returnUrl
    );

    res.json({
      url: portalSession.url,
    });
  } catch (error: any) {
    logError('Erro ao criar portal session:', error);
    const errorResponse = formatErrorResponse(error, 'Erro ao criar sessão do portal');
    res.status(500).json(errorResponse);
  }
};

/** POST /api/stripe/webhook */
export const handleWebhook = processStripeWebhook;

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
      .select('id, stripe_customer_id, stripe_subscription_id, plan_type, subscription_status, last_stripe_event_created')
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
      const { error: freePlanError } = await supabase
        .from('churches')
        .update({
          stripe_subscription_id: null,
          subscription_status: null,
          plan_type: '100',
          subscription_start_date: null,
          subscription_end_date: null,
        })
        .eq('id', church.id);

      if (freePlanError) {
        logError('Erro ao definir plano gratuito no sync:', freePlanError);
        return res.status(500).json({
          error: 'Erro ao atualizar assinatura',
          details: freePlanError.message,
        });
      }

      await insertSubscriptionEvent({
        church_id: church.id,
        event_type: 'sync_subscription',
        old_plan: church.plan_type ?? null,
        new_plan: '100',
        old_status: church.subscription_status ?? null,
        new_status: null,
        source: 'api',
        payload: { reason: 'no_stripe_subscription' },
      });

      billingLog({
        event: 'sync_subscription',
        church_id: church.id,
        outcome: 'skipped',
        reason: 'no_stripe_subscription',
        request_id: req.requestId,
      });
      recordSyncSubscription('skipped');

      return res.json({
        message: 'Nenhuma assinatura encontrada no Stripe',
        synced: false,
      });
    }

    const tenantScoped = subscriptions.data.filter(
      (sub) =>
        sub.id === church.stripe_subscription_id ||
        sub.metadata?.church_id === church.id
    );

    if (tenantScoped.length === 0) {
      recordSyncSubscription('no_tenant_subscription');
      return res.json({
        message: 'Nenhuma assinatura desta igreja encontrada no Stripe',
        synced: false,
      });
    }

    const activeSubscriptions = tenantScoped.filter((sub) =>
      ['active', 'trialing', 'past_due'].includes(sub.status)
    );

    let subscription: Stripe.Subscription;

    if (activeSubscriptions.length > 0) {
      activeSubscriptions.sort((a, b) => (b.created as number) - (a.created as number));
      subscription = activeSubscriptions[0];
    } else {
      tenantScoped.sort((a, b) => (b.created as number) - (a.created as number));
      subscription = tenantScoped[0];
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

    // SL07: setar last_stripe_event_created com timestamp atual do sync para evitar que
    // webhooks antigos (atrasados) sobrescrevam o estado mais recente lido da API Stripe.
    const syncTimestamp = Math.floor(Date.now() / 1000);

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
        last_stripe_event_created: syncTimestamp,
      })
      .eq('id', church.id);

    if (updateError) {
      logError('Erro ao atualizar assinatura:', updateError);
      return res.status(500).json({
        error: 'Erro ao atualizar assinatura',
        details: updateError.message,
      });
    }

    await insertSubscriptionEvent({
      church_id: church.id,
      event_type: 'sync_subscription',
      old_plan: church.plan_type ?? null,
      new_plan: finalPlanType,
      old_status: church.subscription_status ?? null,
      new_status: subscription.status,
      source: 'api',
      stripe_event_id: subscriptionId,
      payload: { subscription_id: subscriptionId },
    });

    billingLog({
      event: 'sync_subscription',
      church_id: church.id,
      outcome: 'success',
      plan_type: finalPlanType,
      subscription_status: subscription.status,
      request_id: req.requestId,
    });
    recordSyncSubscription('success');

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
  } catch (err: unknown) {
    recordSyncSubscription('error');
    logError('Erro ao sincronizar assinatura:', err);
    const errorResponse = formatErrorResponse(err, 'Erro ao sincronizar assinatura');
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

    const { error: updateError } = await supabase
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

    if (updateError) {
      logError('Erro ao atualizar plano no banco após Stripe:', updateError);
      return res.status(500).json({
        error: 'Plano alterado no Stripe, mas falhou ao atualizar localmente',
        details:
          'Use "Sincronizar assinatura" em Configurações → Plano para alinhar os dados.',
      });
    }

    // DB05: histórico de billing para troca de plano via API
    await insertSubscriptionEvent({
      church_id: church.id,
      event_type: 'plan_changed',
      old_plan: church.plan_type ?? null,
      new_plan: planType ?? null,
      old_status: church.stripe_subscription_id ? 'active' : null,
      new_status: updatedSubscription.status,
      source: 'api',
      stripe_event_id: updatedSubscription.id,
      payload: { old_plan: church.plan_type, new_plan: planType, subscription_id: updatedSubscription.id },
    });

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
        logError('Erro ao enviar email de confirmação de troca de plano:', emailError);
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
    logError('Erro ao trocar plano:', error);
    const errorResponse = formatErrorResponse(error, 'Erro ao trocar plano');
    res.status(500).json(errorResponse);
  }
};

/**
 * Health check do Stripe
 * GET /health/stripe
 */
export const checkStripeHealth = async (_req: Request, res: Response) => {
  const stripe_configured =
    !!process.env.STRIPE_SECRET_KEY &&
    !!process.env.STRIPE_WEBHOOK_SECRET &&
    !!process.env.STRIPE_PRICE_ID_M200 &&
    !!process.env.STRIPE_PRICE_ID_M500 &&
    !!process.env.STRIPE_PRICE_ID_M800;

  if (!stripe_configured) {
    return res.status(503).json({
      status: 'unhealthy',
      stripe_configured: false,
      timestamp: new Date().toISOString(),
    });
  }

  let stripe_reachable = false;
  try {
    await stripe.balance.retrieve();
    stripe_reachable = true;
  } catch {
    stripe_reachable = false;
  }

  const { data: lastWebhook } = await supabaseAdmin
    .from('processed_webhook_events')
    .select('processed_at')
    .order('processed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    status: stripe_reachable ? 'ok' : 'degraded',
    stripe_configured: true,
    stripe_reachable,
    last_webhook_processed_at: lastWebhook?.processed_at ?? null,
    timestamp: new Date().toISOString(),
  };

  if (!stripe_reachable) {
    return res.status(503).json(payload);
  }

  res.json(payload);
};

/**
 * Verificar status de checkout session
 * GET /api/stripe/checkout-status?session_id=xxx
 */
export const checkCheckoutStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.church) {
      return res.status(401).json({
        confirmed: false,
        error: 'Não autenticado',
      });
    }

    const sessionId = req.query.session_id as string;

    if (!sessionId) {
      return res.status(400).json({
        error: 'session_id é obrigatório',
        details: 'Forneça o session_id na query string',
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({
        confirmed: false,
        error: 'Sessão não encontrada',
      });
    }

    const sessionChurchId = session.metadata?.church_id;
    if (sessionChurchId !== req.church.churchId) {
      return res.json({
        confirmed: false,
        message: 'Sessão não pertence à igreja ativa',
      });
    }

    if (session.payment_status !== 'paid') {
      return res.json({
        confirmed: false,
        payment_status: session.payment_status,
        message: 'Pagamento ainda não foi processado',
      });
    }

    if (!session.subscription) {
      return res.json({
        confirmed: false,
        payment_status: session.payment_status,
        message: 'Assinatura ainda não foi criada',
      });
    }

    const sessionCustomerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id;

    const { data: church } = await supabase
      .from('churches')
      .select('id, stripe_customer_id, stripe_subscription_id, plan_type, subscription_status')
      .eq('id', req.church.churchId)
      .single();

    if (!church) {
      return res.json({ confirmed: false, message: 'Igreja não encontrada' });
    }

    if (
      church.stripe_customer_id &&
      sessionCustomerId &&
      church.stripe_customer_id !== sessionCustomerId
    ) {
      return res.json({
        confirmed: false,
        message: 'Customer da sessão não corresponde à igreja',
      });
    }

    const confirmedStatuses = ['active', 'trialing'];
    if (
      church.stripe_subscription_id === session.subscription &&
      church.subscription_status &&
      confirmedStatuses.includes(church.subscription_status)
    ) {
      return res.json({
        confirmed: true,
        payment_status: session.payment_status,
        subscription_id: session.subscription,
        plan_type: church.plan_type,
        subscription_status: church.subscription_status,
      });
    }

    return res.json({
      confirmed: false,
      payment_status: session.payment_status,
      subscription_id: session.subscription,
      message: 'Pagamento confirmado, aguardando processamento...',
    });
  } catch (error: any) {
    logError('Erro ao verificar status do checkout:', error);
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
      .select('id, plan_type, stripe_subscription_id')
      .eq('id', req.church!.churchId)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Usuário não possui igreja cadastrada',
      });
    }

    // Idempotência: plano gratuito já está ativo
    if (church.plan_type === '100') {
      return res.json({
        message: 'Plano gratuito já está ativo',
        plan_type: '100',
      });
    }

    const FREE_PLAN_LIMIT = 100;
    const limitCheck = await checkMemberLimit(church.id, 0);
    if (limitCheck.currentCount > FREE_PLAN_LIMIT) {
      const membersToRemove = limitCheck.currentCount - FREE_PLAN_LIMIT;
      return res.status(400).json({
        error: 'Não é possível ativar plano gratuito',
        details: `Você possui ${limitCheck.currentCount} membros, mas o plano gratuito permite apenas ${FREE_PLAN_LIMIT}. Remova ${membersToRemove} membro(s) antes de fazer o downgrade.`,
        currentCount: limitCheck.currentCount,
        newLimit: FREE_PLAN_LIMIT,
        membersToRemove,
      });
    }

    // SL01: se existir assinatura paga ativa no Stripe, cancelar imediatamente
    // para evitar cobrança após downgrade para plano gratuito
    if (church.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(church.stripe_subscription_id);
      } catch (stripeErr: any) {
        // Subscription pode já estar cancelada no Stripe — não bloquear o downgrade
        if (stripeErr?.code !== 'resource_missing') {
          logError('Erro ao cancelar assinatura Stripe no activate-free-plan', {
            churchId: church.id,
            subscriptionId: church.stripe_subscription_id,
            err: stripeErr?.message,
          });
          return res.status(500).json({
            error: 'Erro ao cancelar assinatura Stripe',
            details: process.env.NODE_ENV === 'development'
              ? stripeErr?.message
              : 'Não foi possível cancelar a assinatura paga. Tente novamente.',
          });
        }
      }
    }

    // Atualizar igreja com plano gratuito, limpando campos de assinatura paga
    const { error: updateError } = await supabase
      .from('churches')
      .update({
        plan_type: '100',
        subscription_status: 'canceled',
        stripe_subscription_id: null,
        subscription_end_date: new Date().toISOString(),
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', church.id);

    if (updateError) {
      logError('Erro ao atualizar plano gratuito:', updateError);
      return res.status(500).json({
        error: 'Erro ao ativar plano gratuito',
        details: process.env.NODE_ENV === 'development'
          ? `Erro do banco de dados: ${updateError.message || JSON.stringify(updateError)}`
          : 'Não foi possível atualizar o plano. Verifique se o plano gratuito está habilitado no banco de dados.',
      });
    }

    // DB05: histórico de billing para downgrade para plano gratuito
    await insertSubscriptionEvent({
      church_id: church.id,
      event_type: 'activate_free',
      old_plan: church.plan_type ?? null,
      new_plan: '100',
      new_status: 'canceled',
      source: 'api',
      payload: { old_plan: church.plan_type, subscription_id: church.stripe_subscription_id },
    });

    res.json({
      message: 'Plano gratuito ativado com sucesso',
      plan_type: '100',
    });
  } catch (error: any) {
    logError('Erro ao ativar plano gratuito:', error);
    const errorResponse = formatErrorResponse(error, 'Erro ao ativar plano gratuito');
    res.status(500).json(errorResponse);
  }
};

/** Tipos exibidos no histórico da UI (criação + mudanças de plano; sem sync/pagamentos). */
const SUBSCRIPTION_HISTORY_EVENT_TYPES = [
  'subscription_created',
  'plan_changed',
  'activate_free',
  'downgrade_job',
] as const;

/**
 * Histórico de eventos de assinatura da igreja ativa
 * GET /api/stripe/subscription-events?limit=20&offset=0
 */
export const getSubscriptionEvents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.church) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '20'), 10) || 20, 1), 50);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);
    const churchId = req.church.churchId;

    const { data, error, count } = await supabase
      .from('church_subscription_events')
      .select(
        'id, event_type, old_plan, new_plan, old_status, new_status, source, stripe_event_id, payload, created_at',
        { count: 'exact' }
      )
      .eq('church_id', churchId)
      .in('event_type', [...SUBSCRIPTION_HISTORY_EVENT_TYPES])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logError('Erro ao buscar subscription events', error);
      return res.status(500).json({ error: 'Erro ao buscar histórico de assinatura' });
    }

    res.json({
      events: data ?? [],
      pagination: {
        limit,
        offset,
        total: count ?? 0,
        has_more: (count ?? 0) > offset + limit,
      },
    });
  } catch (err: unknown) {
    logError('Erro ao buscar subscription events', err);
    res.status(500).json({ error: 'Erro ao buscar histórico de assinatura' });
  }
};


import { Request, Response } from 'express';
import Stripe from 'stripe';
import { PostgrestError } from '@supabase/supabase-js';
import { stripe, STRIPE_PRICE_IDS } from './stripe';
import { supabaseAdmin } from './supabase';
import { assertCheckoutCustomerMatchesChurch } from './stripeTenantService';
import { debug, warn, error as logError } from '../utils/logger';
import { billingLog, billingError, billingWarn } from '../utils/structuredLogger';
import {
  recordWebhookMetrics,
  recordSubscriptionEventInsertFailed,
} from '../utils/billingMetrics';
import { captureBillingException } from '../utils/sentryBilling';
import { sendOpsAlert } from './opsAlertService';
import { redactEmail } from '../utils/redact';
import { sendEmail } from './emailService';
import {
  getPaymentSuccessTemplate,
  getPaymentFailedTemplate,
  getSubscriptionCanceledTemplate,
  getSubscriptionScheduledCancellationTemplate,
  getRenewalSuccessTemplate,
  getSubscriptionReactivatedTemplate,
} from '../templates/stripeEmailTemplates';
import { getPlanConfig } from '../config/plans';

// ──────────────────────────────────────────────────────────────────────────────
// DB05: helper para registrar transições de assinatura no histórico de billing
// ──────────────────────────────────────────────────────────────────────────────
interface SubscriptionEventRecord {
  church_id?: string | null;
  event_type: string;
  old_plan?: string | null;
  new_plan?: string | null;
  old_status?: string | null;
  new_status?: string | null;
  source?: string;
  stripe_event_id?: string | null;
  payload?: Record<string, unknown> | null;
}

const INSERT_RETRIES = 2;
const INSERT_RETRY_MS = 150;

let subscriptionEventInsertFailures = 0;

export function getSubscriptionEventInsertFailureCount(): number {
  return subscriptionEventInsertFailures;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Registra transição de assinatura com retry (OB04 Ciclo 2).
 * Retorna true se persistido; false após esgotar tentativas.
 */
export async function insertSubscriptionEvent(
  record: SubscriptionEventRecord
): Promise<boolean> {
  const payload = {
    church_id: record.church_id ?? null,
    event_type: record.event_type,
    old_plan: record.old_plan ?? null,
    new_plan: record.new_plan ?? null,
    old_status: record.old_status ?? null,
    new_status: record.new_status ?? null,
    source: record.source ?? 'webhook',
    stripe_event_id: record.stripe_event_id ?? null,
    payload: record.payload ?? null,
  };

  let lastError: PostgrestError | null = null;

  for (let attempt = 0; attempt <= INSERT_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(INSERT_RETRY_MS * attempt);
    }

    const { error } = await supabaseAdmin.from('church_subscription_events').insert(payload);
    if (!error) {
      return true;
    }
    lastError = error;
  }

  subscriptionEventInsertFailures++;
  recordSubscriptionEventInsertFailed();
  const errMsg = lastError?.message ?? 'unknown';

  billingError({
    event: 'church_subscription_events_insert_failed',
    church_id: record.church_id ?? undefined,
    event_type: record.event_type,
    attempts: INSERT_RETRIES + 1,
    failure_count: subscriptionEventInsertFailures,
    error: errMsg,
  });

  logError('Falha ao registrar church_subscription_events', { ...record, error: lastError });

  sendOpsAlert('Falha ao registrar church_subscription_events', {
    church_id: record.church_id,
    event_type: record.event_type,
    attempts: INSERT_RETRIES + 1,
    error: errMsg,
  });

  return false;
}

const HANDLED_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
]);

export type WebhookClaimResult = 'claimed' | 'duplicate' | 'infra_error';

type DbResult<T> = { data: T | null; error: PostgrestError | null };

export type SubscriptionUpdatePayload = {
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  plan_type?: string | null;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
};

export function assertDbOk<T>(result: DbResult<T>, context: string): T {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  if (result.data === null || result.data === undefined) {
    throw new Error(`${context}: nenhum registro retornado`);
  }
  return result.data;
}

export function fireAndForgetEmail(promise: Promise<unknown>): void {
  void promise.catch((err) => {
    logError('Falha ao enviar e-mail (webhook)', err);
  });
}

export async function claimWebhookEvent(
  eventId: string,
  eventType: string
): Promise<WebhookClaimResult> {
  const { error: insertError } = await supabaseAdmin.from('processed_webhook_events').insert({
    stripe_event_id: eventId,
    event_type: eventType,
    outcome: 'processing',
  });

  if (!insertError) {
    return 'claimed';
  }

  if (insertError.code === '23505') {
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('processed_webhook_events')
      .select('outcome')
      .eq('stripe_event_id', eventId)
      .maybeSingle();

    if (selectError) {
      logError('Erro ao verificar claim existente', { eventId, selectError });
      return 'infra_error';
    }

    if (existing?.outcome === 'released') {
      const { error: updateError } = await supabaseAdmin
        .from('processed_webhook_events')
        .update({
          outcome: 'processing',
          event_type: eventType,
          processed_at: new Date().toISOString(),
          processing_ms: null,
          church_id: null,
        })
        .eq('stripe_event_id', eventId);

      return updateError ? 'infra_error' : 'claimed';
    }

    return 'duplicate';
  }

  logError('Erro ao registrar claim de webhook', { eventId, eventType, insertError });
  return 'infra_error';
}

export async function finalizeWebhookEvent(
  eventId: string,
  params: { outcome: 'success' | 'released'; church_id?: string; processing_ms: number }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('processed_webhook_events')
    .update({
      outcome: params.outcome,
      church_id: params.church_id ?? null,
      processing_ms: params.processing_ms,
      processed_at: new Date().toISOString(),
    })
    .eq('stripe_event_id', eventId);

  if (error) {
    logError('Erro ao finalizar claim de webhook', { eventId, params, error });
  }
}

export async function releaseWebhookClaim(
  eventId: string,
  processing_ms = 0
): Promise<void> {
  await finalizeWebhookEvent(eventId, { outcome: 'released', processing_ms });
}

function isStaleEvent(
  lastEventCreated: number | null | undefined,
  eventCreated: number
): boolean {
  if (lastEventCreated == null) {
    return false;
  }
  return lastEventCreated >= eventCreated;
}

export async function getUserEmailFromChurch(churchId: string): Promise<string | null> {
  try {
    const { data: church, error: churchError } = await supabaseAdmin
      .from('churches')
      .select('user_id')
      .eq('id', churchId)
      .single();

    if (churchError || !church?.user_id) {
      return null;
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.admin.getUserById(church.user_id);

    if (userError || !user?.email) {
      return null;
    }

    return user.email;
  } catch (err) {
    warn('getUserEmailFromChurch falhou', { churchId, err });
    return null;
  }
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function shouldSetToFreePlan(status: string, endDate: Date | null): boolean {
  if (status !== 'canceled') {
    return false;
  }
  if (!endDate) {
    return true;
  }
  return endDate < new Date();
}

export function getSubscriptionEndDate(subscription: Stripe.Subscription | Record<string, unknown>): Date | null {
  const sub = subscription as Record<string, unknown>;
  const cancelAt = sub.cancel_at as number | null;
  const canceledAt = sub.canceled_at as number | null;
  const currentPeriodEnd = sub.current_period_end as number | null;

  if (cancelAt) return new Date(cancelAt * 1000);
  if (canceledAt) return new Date(canceledAt * 1000);
  if (currentPeriodEnd) return new Date(currentPeriodEnd * 1000);
  return null;
}

function planTypeFromPriceId(priceId: string, fallback?: string | null): string | null {
  return (
    Object.entries(STRIPE_PRICE_IDS).find(([, id]) => id === priceId)?.[0] ||
    fallback ||
    null
  );
}

/**
 * Atualiza igreja ou assinatura pendente pelo customer_id do Stripe.
 */
export async function updateSubscriptionByStripeCustomer(
  customerId: string,
  payload: SubscriptionUpdatePayload,
  eventCreated: number
): Promise<{ target: 'church' | 'pending' | 'none'; id: string; name?: string }> {
  const updatePayload = {
    ...payload,
    last_stripe_event_created: eventCreated,
  };

  const { data: church, error: churchSelectError } = await supabaseAdmin
    .from('churches')
    .select('id, name, last_stripe_event_created')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (churchSelectError) {
    throw new Error(`Buscar igreja por customer_id: ${churchSelectError.message}`);
  }

  if (church) {
    if (isStaleEvent(church.last_stripe_event_created, eventCreated)) {
      debug('Evento Stripe ignorado (stale) para igreja', {
        churchId: church.id,
        eventCreated,
        last: church.last_stripe_event_created,
      });
      return { target: 'church', id: church.id, name: church.name };
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('churches')
      .update(updatePayload)
      .eq('id', church.id)
      .select('id, name')
      .single();

    const churchRow = assertDbOk(
      { data: updated, error: updateError },
      'Atualizar igreja por webhook'
    );
    return { target: 'church', id: churchRow.id, name: churchRow.name };
  }

  const { data: pending, error: pendingSelectError } = await supabaseAdmin
    .from('pending_subscriptions')
    .select('id, last_stripe_event_created')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (pendingSelectError) {
    throw new Error(`Buscar pending por customer_id: ${pendingSelectError.message}`);
  }

  if (pending) {
    if (isStaleEvent(pending.last_stripe_event_created, eventCreated)) {
      debug('Evento Stripe ignorado (stale) para pending', {
        pendingId: pending.id,
        eventCreated,
      });
      return { target: 'pending', id: pending.id };
    }

    const { data: updatedPending, error: pendingUpdateError } = await supabaseAdmin
      .from('pending_subscriptions')
      .update(updatePayload)
      .eq('id', pending.id)
      .select('id')
      .single();

    const pendingRow = assertDbOk(
      { data: updatedPending, error: pendingUpdateError },
      'Atualizar pending_subscriptions por webhook'
    );
    return { target: 'pending', id: pendingRow.id };
  }

  warn('Nenhum alvo (igreja/pending) para customer_id do Stripe', { customerId });
  return { target: 'none', id: '' };
}

async function sendPaymentSuccessEmail(
  churchId: string,
  churchName: string,
  planType: string | null,
  subscription: Stripe.Subscription
): Promise<void> {
  const userEmail = await getUserEmailFromChurch(churchId);
  if (!userEmail) return;

  const planConfig = getPlanConfig(planType);
  const currentPeriodEnd = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;

  fireAndForgetEmail(
    sendEmail({
      to: userEmail,
      subject: 'Pagamento Confirmado - Flock',
      html: getPaymentSuccessTemplate({
        churchName,
        planName: planConfig?.name || `Plano ${planType}`,
        amount: planConfig?.priceFormatted || 'N/A',
        nextBillingDate: currentPeriodEnd
          ? formatDate(new Date(currentPeriodEnd * 1000))
          : undefined,
      }),
    })
  );
}

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventCreated: number
): Promise<void> {
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
  const plan = session.metadata?.plan;

  if (!customerId || !subscriptionId) {
    throw new Error('checkout.session.completed: customer ou subscription ausente');
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;
  const planType = planTypeFromPriceId(priceId, plan);

  const sub = subscription as Stripe.Subscription & {
    current_period_start?: number;
    cancel_at?: number | null;
  };
  const churchUpdate = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    subscription_status: subscription.status,
    plan_type: planType,
    subscription_start_date: sub.current_period_start
      ? new Date(sub.current_period_start * 1000).toISOString()
      : null,
    subscription_end_date: sub.cancel_at
      ? new Date(sub.cancel_at * 1000).toISOString()
      : null,
    last_stripe_event_created: eventCreated,
  };

  const churchId = session.metadata?.church_id;
  const customerEmail = session.metadata?.customer_email || session.customer_email;

  if (churchId && churchId !== 'pending') {
    await assertCheckoutCustomerMatchesChurch(churchId, customerId);

    const result = await supabaseAdmin
      .from('churches')
      .update(churchUpdate)
      .eq('id', churchId)
      .select('id, name')
      .single();

    const church = assertDbOk(result, `Vincular checkout à igreja ${churchId}`);
    await insertSubscriptionEvent({
      church_id: church.id,
      event_type: 'subscription_created',
      new_plan: planType,
      new_status: subscription.status,
      source: 'webhook',
      stripe_event_id: subscription.id,
      payload: { subscription_id: subscription.id, plan: planType },
    });
    fireAndForgetEmail(sendPaymentSuccessEmail(church.id, church.name, planType, subscription));
    return;
  }

  const existingResult = await supabaseAdmin
    .from('churches')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (existingResult.error) {
    throw new Error(`Buscar igreja por customer_id: ${existingResult.error.message}`);
  }

  if (existingResult.data) {
    const updateResult = await supabaseAdmin
      .from('churches')
      .update(churchUpdate)
      .eq('id', existingResult.data.id)
      .select('id, name')
      .single();

    const church = assertDbOk(updateResult, 'Vincular checkout por customer_id existente');
    await insertSubscriptionEvent({
      church_id: church.id,
      event_type: 'subscription_created',
      new_plan: planType,
      new_status: subscription.status,
      source: 'webhook',
      stripe_event_id: subscription.id,
      payload: { subscription_id: subscription.id, plan: planType },
    });
    fireAndForgetEmail(sendPaymentSuccessEmail(church.id, church.name, planType, subscription));
    return;
  }

  if (!customerEmail) {
    throw new Error(
      'checkout.session.completed: não foi possível vincular assinatura (email ausente)'
    );
  }

  const linkToken = session.metadata?.link_token;

  const pendingPayload: Record<string, unknown> = {
    email: customerEmail,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan_type: planType,
    subscription_status: subscription.status,
    subscription_start_date: churchUpdate.subscription_start_date,
    last_stripe_event_created: eventCreated,
  };
  if (linkToken) {
    pendingPayload.link_token = linkToken;
  }

  const { data: existingPending } = await supabaseAdmin
    .from('pending_subscriptions')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  let pendingId: string;
  if (existingPending) {
    const updatePending = await supabaseAdmin
      .from('pending_subscriptions')
      .update(pendingPayload)
      .eq('id', existingPending.id)
      .select('id')
      .single();
    pendingId = assertDbOk(updatePending, 'Atualizar pending_subscriptions no checkout').id;
  } else {
    const insertPending = await supabaseAdmin
      .from('pending_subscriptions')
      .insert(pendingPayload)
      .select('id')
      .single();
    pendingId = assertDbOk(insertPending, 'Inserir pending_subscriptions no checkout').id;
  }

  await insertSubscriptionEvent({
    church_id: null,
    event_type: 'pending_checkout',
    new_plan: planType,
    new_status: subscription.status,
    source: 'webhook',
    stripe_event_id: subscriptionId,
    payload: {
      customer_id: customerId,
      pending_id: pendingId,
      session_id: session.id,
      email: redactEmail(customerEmail),
    },
  });
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  eventCreated: number
): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) {
    throw new Error('customer.subscription.updated: customer_id ausente');
  }

  const subscriptionId = subscription.id;
  const priceId = subscription.items.data[0].price.id;
  const planType = planTypeFromPriceId(priceId);
  const currentPeriodStart = (subscription as Stripe.Subscription & { current_period_start?: number })
    .current_period_start;
  const endDate = getSubscriptionEndDate(subscription);
  const finalPlanType = shouldSetToFreePlan(subscription.status, endDate) ? '100' : planType;

  const { data: churchBeforeUpdate } = await supabaseAdmin
    .from('churches')
    .select(
      'id, name, subscription_status, plan_type, subscription_end_date, stripe_subscription_id'
    )
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  const updateResult = await updateSubscriptionByStripeCustomer(
    customerId,
    {
      stripe_subscription_id: subscriptionId,
      subscription_status: subscription.status,
      plan_type: finalPlanType,
      subscription_start_date: currentPeriodStart
        ? new Date(currentPeriodStart * 1000).toISOString()
        : null,
      subscription_end_date: endDate ? endDate.toISOString() : null,
    },
    eventCreated
  );

  if (updateResult.target === 'none' || updateResult.target === 'pending') {
    return;
  }

  const church = { id: updateResult.id, name: updateResult.name || '' };

  // DB05: histórico de billing
  await insertSubscriptionEvent({
    church_id: church.id,
    event_type: 'subscription_updated',
    old_plan: churchBeforeUpdate?.plan_type ?? null,
    new_plan: finalPlanType,
    old_status: churchBeforeUpdate?.subscription_status ?? null,
    new_status: subscription.status,
    source: 'webhook',
    stripe_event_id: String(subscription.id),
    payload: { id: subscription.id, status: subscription.status, plan: finalPlanType },
  });

  const isNowActive = subscription.status === 'active';
  const sub = subscription as Stripe.Subscription & {
    cancel_at_period_end?: boolean;
    canceled_at?: number | null;
    cancel_at?: number | null;
  };

  // SL09: variável nomeada corretamente — verdadeiro quando cancelamento agendado foi removido
  const cancelAtPeriodEndRemoved = sub.cancel_at_period_end === false;

  const hadPreviousSubscription =
    churchBeforeUpdate?.stripe_subscription_id != null &&
    churchBeforeUpdate.stripe_subscription_id !== undefined;

  const wasCanceled =
    hadPreviousSubscription &&
    (churchBeforeUpdate?.subscription_status === 'canceled' ||
      (churchBeforeUpdate?.subscription_end_date != null &&
        new Date(churchBeforeUpdate.subscription_end_date) < new Date()));

  // SL09: reativação = era cancelada/agendada e agora está ativa sem agendamento
  const isReactivated = isNowActive && cancelAtPeriodEndRemoved && wasCanceled;

  if (isReactivated) {
    const userEmail = await getUserEmailFromChurch(church.id);
    if (userEmail) {
      const planConfig = getPlanConfig(planType);
      const currentPeriodEnd = (subscription as Stripe.Subscription & { current_period_end?: number })
        .current_period_end;
      fireAndForgetEmail(
        sendEmail({
          to: userEmail,
          subject: 'Assinatura Reativada - Flock',
          html: getSubscriptionReactivatedTemplate({
            churchName: church.name,
            planName: planConfig?.name || `Plano ${planType || 'anterior'}`,
            amount: planConfig?.priceFormatted || 'N/A',
            nextBillingDate: currentPeriodEnd
              ? formatDate(new Date(currentPeriodEnd * 1000))
              : formatDate(new Date()),
          }),
        })
      );
    }
    return;
  }

  // SL02: e-mail de cancelamento APENAS quando assinatura efetivamente encerrada
  const isActuallyCanceled = subscription.status === 'canceled';

  // SL02: e-mail distinto para cancelamento agendado (portal "cancelar ao fim do período")
  const isScheduledCancellation =
    !isActuallyCanceled &&
    sub.cancel_at_period_end === true;

  if (isActuallyCanceled) {
    const userEmail = await getUserEmailFromChurch(church.id);
    if (userEmail) {
      const planConfig = getPlanConfig(planType);
      fireAndForgetEmail(
        sendEmail({
          to: userEmail,
          subject: 'Assinatura Cancelada - Flock',
          html: getSubscriptionCanceledTemplate({
            churchName: church.name,
            planName: planConfig?.name || `Plano ${planType || 'anterior'}`,
            endDate: endDate ? formatDate(endDate) : 'N/A',
          }),
        })
      );
    }
    return;
  }

  if (isScheduledCancellation) {
    const userEmail = await getUserEmailFromChurch(church.id);
    if (userEmail) {
      const planConfig = getPlanConfig(planType);
      fireAndForgetEmail(
        sendEmail({
          to: userEmail,
          subject: 'Cancelamento Agendado - Flock',
          html: getSubscriptionScheduledCancellationTemplate({
            churchName: church.name,
            planName: planConfig?.name || `Plano ${planType || 'anterior'}`,
            endDate: endDate ? formatDate(endDate) : 'N/A',
          }),
        })
      );
    }
  }
}

/**
 * SL03: Handler dedicado para customer.subscription.created.
 * Evita duplicação de lógica/e-mails quando checkout.session.completed já vinculou a assinatura.
 */
export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  eventCreated: number
): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) {
    throw new Error('customer.subscription.created: customer_id ausente');
  }

  // Verificar se checkout já vinculou esta assinatura na church
  const { data: church } = await supabaseAdmin
    .from('churches')
    .select('id, stripe_subscription_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (church?.stripe_subscription_id === subscription.id) {
    // checkout.session.completed já processou — no-op
    debug('customer.subscription.created ignorado (checkout já vinculou)', {
      subscriptionId: subscription.id,
      customerId,
    });
    return;
  }

  // Caso raro: assinatura criada sem checkout prévio (ex: API direta) → processar normalmente
  await handleSubscriptionUpdated(subscription, eventCreated);
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  eventCreated: number
): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) {
    throw new Error('customer.subscription.deleted: customer_id ausente');
  }

  const endDate = getSubscriptionEndDate(subscription) || new Date();
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const planType = priceId ? planTypeFromPriceId(priceId) : null;

  const updateResult = await updateSubscriptionByStripeCustomer(
    customerId,
    {
      subscription_status: 'canceled',
      subscription_end_date: endDate.toISOString(),
      plan_type: '100',
    },
    eventCreated
  );

  if (updateResult.target !== 'church') {
    return;
  }

  // DB05: histórico de billing
  await insertSubscriptionEvent({
    church_id: updateResult.id,
    event_type: 'subscription_canceled',
    new_plan: '100',
    new_status: 'canceled',
    source: 'webhook',
    stripe_event_id: subscription.id,
    payload: { id: subscription.id, status: 'canceled' },
  });

  const userEmail = await getUserEmailFromChurch(updateResult.id);
  if (userEmail) {
    const planConfig = getPlanConfig(planType);
    fireAndForgetEmail(
      sendEmail({
        to: userEmail,
        subject: 'Assinatura Cancelada - Flock',
        html: getSubscriptionCanceledTemplate({
          churchName: updateResult.name || 'Igreja',
          planName: planConfig?.name || `Plano ${planType || 'anterior'}`,
          endDate: formatDate(endDate),
        }),
      })
    );
  }
}

export async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  eventCreated: number
): Promise<void> {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  const inv = invoice as Stripe.Invoice & { subscription?: string | { id: string } | null };
  const subscriptionId =
    typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;

  if (!customerId || !subscriptionId) {
    warn('invoice.payment_succeeded ignorado: customer ou subscription ausente', {
      invoice_id: invoice.id,
    });
    billingWarn({
      event: 'stripe_webhook_handler_skipped',
      handler: 'payment_succeeded',
      reason: 'missing_customer_or_subscription',
      invoice_id: invoice.id,
    });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;
  const planType = planTypeFromPriceId(priceId);

  // SL06: atualizar plan_type, datas de período e status na renovação
  // evita drift silencioso entre Stripe e banco caso o plano tenha mudado via portal
  const currentPeriodStart = (subscription as Stripe.Subscription & { current_period_start?: number })
    .current_period_start;
  const currentPeriodEnd = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  const endDate = getSubscriptionEndDate(subscription);
  const finalPlanType = shouldSetToFreePlan(subscription.status, endDate) ? '100' : planType;

  const updateResult = await updateSubscriptionByStripeCustomer(
    customerId,
    {
      subscription_status: 'active',
      plan_type: finalPlanType,
      subscription_start_date: currentPeriodStart
        ? new Date(currentPeriodStart * 1000).toISOString()
        : null,
      subscription_end_date: endDate ? endDate.toISOString() : null,
    },
    eventCreated
  );

  if (updateResult.target !== 'church') {
    billingWarn({
      event: 'stripe_webhook_handler_skipped',
      handler: 'payment_succeeded',
      reason: `target_${updateResult.target}`,
      customer_id: customerId,
      subscription_id: subscriptionId,
    });
    return;
  }

  // DB05: histórico de billing
  await insertSubscriptionEvent({
    church_id: updateResult.id,
    event_type: 'payment_succeeded',
    new_plan: finalPlanType,
    new_status: 'active',
    source: 'webhook',
    stripe_event_id: subscriptionId,
    payload: { subscription_id: subscriptionId, plan: finalPlanType },
  });

  const userEmail = await getUserEmailFromChurch(updateResult.id);
  if (!userEmail) return;

  const planConfig = getPlanConfig(planType);

  fireAndForgetEmail(
    sendEmail({
      to: userEmail,
      subject: 'Renovação Confirmada - Flock',
      html: getRenewalSuccessTemplate({
        churchName: updateResult.name || 'Igreja',
        planName: planConfig?.name || `Plano ${planType}`,
        amount: planConfig?.priceFormatted || 'N/A',
        nextBillingDate: currentPeriodEnd
          ? formatDate(new Date(currentPeriodEnd * 1000))
          : formatDate(new Date()),
      }),
    })
  );
}

export async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  eventCreated: number
): Promise<void> {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  const inv = invoice as Stripe.Invoice & { subscription?: string | { id: string } | null };
  const subscriptionId =
    typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;

  if (!customerId || !subscriptionId) {
    warn('invoice.payment_failed ignorado: customer ou subscription ausente', {
      invoice_id: invoice.id,
    });
    billingWarn({
      event: 'stripe_webhook_handler_skipped',
      handler: 'payment_failed',
      reason: 'missing_customer_or_subscription',
      invoice_id: invoice.id,
    });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;
  const planType = planTypeFromPriceId(priceId);

  const updateResult = await updateSubscriptionByStripeCustomer(
    customerId,
    { subscription_status: 'past_due' },
    eventCreated
  );

  if (updateResult.target !== 'church') {
    billingWarn({
      event: 'stripe_webhook_handler_skipped',
      handler: 'payment_failed',
      reason: `target_${updateResult.target}`,
      customer_id: customerId,
      subscription_id: subscriptionId,
    });
    return;
  }

  // DB05: histórico de billing
  await insertSubscriptionEvent({
    church_id: updateResult.id,
    event_type: 'payment_failed',
    new_status: 'past_due',
    source: 'webhook',
    stripe_event_id: subscriptionId,
    payload: { subscription_id: subscriptionId },
  });

  const userEmail = await getUserEmailFromChurch(updateResult.id);
  if (!userEmail) return;

  const planConfig = getPlanConfig(planType);
  const invFailed = invoice as Stripe.Invoice & { next_payment_attempt?: number | null };

  fireAndForgetEmail(
    sendEmail({
      to: userEmail,
      subject: 'Pagamento Não Processado - Flock',
      html: getPaymentFailedTemplate({
        churchName: updateResult.name || 'Igreja',
        planName: planConfig?.name || `Plano ${planType}`,
        amount: planConfig?.priceFormatted || 'N/A',
        retryDate: invFailed.next_payment_attempt
          ? formatDate(new Date(invFailed.next_payment_attempt * 1000))
          : undefined,
      }),
    })
  );
}

async function dispatchWebhookEvent(event: Stripe.Event): Promise<void> {
  const eventCreated = event.created;

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, eventCreated);
      break;
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription, eventCreated);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, eventCreated);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, eventCreated);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice, eventCreated);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice, eventCreated);
      break;
    default:
      break;
  }
}

function extractWebhookContext(event: Stripe.Event): {
  church_id?: string;
  customer_id?: string;
  session_id?: string;
} {
  const obj = event.data.object as unknown as Record<string, unknown>;
  const metadata = (obj.metadata as Record<string, string> | undefined) ?? {};
  const churchId = metadata.church_id;
  const customerRaw = obj.customer;
  const customer_id =
    typeof customerRaw === 'string'
      ? customerRaw
      : (customerRaw as { id?: string } | null)?.id;
  const session_id = typeof obj.id === 'string' && event.type.startsWith('checkout.')
    ? obj.id
    : undefined;

  return {
    church_id: churchId && churchId !== 'pending' ? churchId : undefined,
    customer_id,
    session_id,
  };
}

/**
 * Processa POST /api/stripe/webhook
 */
export async function processStripeWebhook(req: Request, res: Response): Promise<void> {
  const startedAt = Date.now();
  const requestId = req.requestId;
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logError('STRIPE_WEBHOOK_SECRET não configurado');
    res.status(500).json({ error: 'Webhook secret não configurado' });
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro de assinatura';
    logError('Erro ao verificar webhook', message);
    const duration_ms = Date.now() - startedAt;
    billingError({
      event: 'stripe_webhook',
      outcome: 'failed',
      request_id: requestId,
      duration_ms,
      error: message,
    });
    recordWebhookMetrics('signature_invalid', duration_ms);
    res.status(400).send(
      process.env.NODE_ENV === 'development' ? `Webhook Error: ${message}` : 'Invalid signature'
    );
    return;
  }

  const ctx = extractWebhookContext(event);

  if (!HANDLED_EVENT_TYPES.has(event.type)) {
    warn(`Evento não tratado: ${event.type}`, {
      stripeEventId: event.id,
      stripeEventType: event.type,
    });
    const duration_ms = Date.now() - startedAt;
    billingLog({
      event: 'stripe_webhook',
      outcome: 'ignored',
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      request_id: requestId,
      duration_ms,
      ...ctx,
    });
    recordWebhookMetrics('ignored', duration_ms);
    res.json({ received: true, ignored: true });
    return;
  }

  const claim = await claimWebhookEvent(event.id, event.type);

  if (claim === 'duplicate') {
    debug(`Evento ${event.id} (${event.type}) já processado`, {
      stripeEventId: event.id,
      stripeEventType: event.type,
    });
    const duration_ms = Date.now() - startedAt;
    billingLog({
      event: 'stripe_webhook',
      outcome: 'duplicate',
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      request_id: requestId,
      duration_ms,
      ...ctx,
    });
    recordWebhookMetrics('duplicate', duration_ms);
    res.json({ received: true, skipped: true });
    return;
  }

  if (claim === 'infra_error') {
    const duration_ms = Date.now() - startedAt;
    billingError({
      event: 'stripe_webhook',
      outcome: 'infra_error',
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      request_id: requestId,
      duration_ms,
      ...ctx,
    });
    recordWebhookMetrics('infra_error', duration_ms);
    sendOpsAlert('Webhook Stripe — infra_error (503)', {
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      request_id: requestId,
      duration_ms,
      ...ctx,
    });
    res.status(503).json({ error: 'Serviço temporariamente indisponível' });
    return;
  }

  try {
    await dispatchWebhookEvent(event);
    const duration_ms = Date.now() - startedAt;
    await finalizeWebhookEvent(event.id, {
      outcome: 'success',
      church_id: ctx.church_id,
      processing_ms: duration_ms,
    });
    billingLog({
      event: 'stripe_webhook',
      outcome: 'success',
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      request_id: requestId,
      duration_ms,
      ...ctx,
    });
    recordWebhookMetrics('success', duration_ms);
    res.json({ received: true });
  } catch (err: unknown) {
    const duration_ms = Date.now() - startedAt;
    await releaseWebhookClaim(event.id, duration_ms);
    const errMsg = err instanceof Error ? err.message : String(err);
    captureBillingException(err, {
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      request_id: requestId,
      ...ctx,
    });
    logError('Erro ao processar webhook', {
      stripeEventId: event.id,
      stripeEventType: event.type,
      err,
    });
    billingError({
      event: 'stripe_webhook',
      outcome: 'failed',
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      request_id: requestId,
      duration_ms,
      error: errMsg,
      ...ctx,
    });
    recordWebhookMetrics('failed', duration_ms);
    sendOpsAlert('Webhook Stripe — falha de processamento (500)', {
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      request_id: requestId,
      error: errMsg,
      ...ctx,
    });
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
}

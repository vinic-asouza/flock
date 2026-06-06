/**
 * SL04: Job diário que garante o downgrade para plan_type:100
 * quando subscription_end_date já passou sem que o webhook
 * customer.subscription.deleted tenha sido processado.
 *
 * Cenário: webhook perdido ou falha 5xx histórica → DB ainda com
 * plan_type 200/500/800 e status não-gratuito após fim do período.
 */

import { supabaseAdmin } from '../services/supabase';
import { warn, debug } from '../utils/logger';
import { billingLog } from '../utils/structuredLogger';
import { sendOpsAlert } from '../services/opsAlertService';
import { insertSubscriptionEvent } from '../services/stripeWebhookService';

export async function downgradeExpiredSubscriptions(): Promise<number> {
  const now = new Date().toISOString();

  // Igrejas cujo período de assinatura já expirou mas plan_type ainda não é 100
  const { data: churches, error } = await supabaseAdmin
    .from('churches')
    .select('id, name, plan_type, subscription_status, subscription_end_date')
    .not('subscription_end_date', 'is', null)
    .lt('subscription_end_date', now)
    .neq('plan_type', '100');

  if (error) {
    warn('downgradeExpiredSubscriptions: erro ao buscar igrejas', error);
    return 0;
  }

  if (!churches || churches.length === 0) {
    debug('downgradeExpiredSubscriptions: nenhuma igreja a fazer downgrade');
    return 0;
  }

  let count = 0;
  for (const church of churches) {
    // Apenas downgrade se status indica que a assinatura está encerrada/cancelada
    // (canceled, past_due). Igrejas com active + end_date futuro são válidas.
    const eligibleStatuses = ['canceled', 'past_due', 'unpaid', 'incomplete_expired'];
    if (!eligibleStatuses.includes(church.subscription_status ?? '')) {
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .from('churches')
      .update({
        plan_type: '100',
        subscription_status: 'canceled',
        stripe_subscription_id: null,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq('id', church.id);

    if (updateError) {
      warn('downgradeExpiredSubscriptions: erro ao fazer downgrade', {
        churchId: church.id,
        error: updateError.message,
      });
    } else {
      count++;
      await insertSubscriptionEvent({
        church_id: church.id,
        event_type: 'downgrade_job',
        old_plan: church.plan_type ?? null,
        new_plan: '100',
        old_status: church.subscription_status ?? null,
        new_status: 'canceled',
        source: 'job',
        payload: { subscription_end_date: church.subscription_end_date },
      });
      debug('downgradeExpiredSubscriptions: downgrade aplicado', {
        churchId: church.id,
        previousPlan: church.plan_type,
        subscriptionEndDate: church.subscription_end_date,
      });
    }
  }

  if (count > 0) {
    billingLog({
      event: 'downgrade_expired_subscriptions',
      outcome: 'success',
      downgrades_applied: count,
    });
    sendOpsAlert(`Downgrade compensatório aplicado (${count} igreja(s))`, {
      downgrades_applied: count,
      hint: 'Indica possíveis webhooks perdidos ou falhas históricas de processamento.',
    });
  }

  return count;
}

export async function runDowngradeExpiredSubscriptionsJob(): Promise<number> {
  return downgradeExpiredSubscriptions();
}

import { supabaseAdmin } from '../services/supabase';
import { billingLog, billingWarn } from '../utils/structuredLogger';
import { sendOpsAlert } from '../services/opsAlertService';
import { warn } from '../utils/logger';

export interface SubscriptionIntegrityIssue {
  church_id: string;
  issue_type: string;
  description: string;
}

/**
 * Executa RPC validate_subscription_integrity() e alerta ops se houver drift.
 */
export async function runSubscriptionIntegrityCheck(): Promise<number> {
  const startedAt = Date.now();

  const { data, error } = await supabaseAdmin.rpc('validate_subscription_integrity');

  if (error) {
    warn('validateSubscriptionIntegrity: erro na RPC', error);
    billingWarn({
      event: 'subscription_integrity_check',
      outcome: 'failed',
      duration_ms: Date.now() - startedAt,
      error: error.message,
    });
    sendOpsAlert('Falha ao executar validate_subscription_integrity', {
      error: error.message,
    });
    return 0;
  }

  const issues = (data ?? []) as SubscriptionIntegrityIssue[];
  const count = issues.length;

  billingLog({
    event: 'subscription_integrity_check',
    outcome: count > 0 ? 'degraded' : 'success',
    duration_ms: Date.now() - startedAt,
    issue_count: count,
  });

  if (count > 0) {
    sendOpsAlert(`Drift de integridade Stripe detectado (${count} igreja(s))`, {
      issue_count: count,
      issues: issues.slice(0, 20),
      truncated: count > 20,
    });
  }

  return count;
}

export async function runSubscriptionIntegrityJob(): Promise<number> {
  return runSubscriptionIntegrityCheck();
}

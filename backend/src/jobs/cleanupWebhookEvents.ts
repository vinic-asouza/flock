import { supabaseAdmin } from '../services/supabase';
import { billingLog } from '../utils/structuredLogger';

/**
 * Remove eventos de webhook processados há mais de 90 dias (função SQL).
 */
export async function cleanupOldWebhookEvents(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin.rpc('cleanup_old_webhook_events');

    if (error) {
      billingLog({
        event: 'webhook_cleanup_failed',
        error: error.message,
      });
      return 0;
    }

    const count = typeof data === 'number' ? data : 0;
    return count;
  } catch (err) {
    billingLog({
      event: 'webhook_cleanup_failed',
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

export async function runWebhookCleanupJob(): Promise<number> {
  return cleanupOldWebhookEvents();
}

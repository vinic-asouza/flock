import { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabase';
import { getSubscriptionEventInsertFailureCount } from '../services/stripeWebhookService';
import { error as logError } from '../utils/logger';

/**
 * GET /api/internal/billing/stats
 * Agregados operacionais para ops (protegido por INTERNAL_BILLING_TOKEN).
 */
export async function getBillingStats(_req: Request, res: Response): Promise<void> {
  try {
    const [
      webhookStatsRes,
      subscriptionStatusRes,
      jobRunsRes,
      recentEventsRes,
      integrityRes,
      webhookOutcomesRes,
    ] = await Promise.all([
      supabaseAdmin.from('vw_webhook_stats').select('*'),
      supabaseAdmin.from('vw_subscription_status').select('validation_status'),
      supabaseAdmin
        .from('job_runs')
        .select('job_name, status, started_at, finished_at, rows_affected, duration_ms, error_message')
        .order('started_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('church_subscription_events')
        .select('id, church_id, event_type, old_plan, new_plan, source, created_at')
        .order('created_at', { ascending: false })
        .limit(15),
      supabaseAdmin.rpc('validate_subscription_integrity'),
      supabaseAdmin
        .from('processed_webhook_events')
        .select('outcome')
        .not('outcome', 'is', null),
    ]);

    if (webhookStatsRes.error) throw webhookStatsRes.error;
    if (subscriptionStatusRes.error) throw subscriptionStatusRes.error;
    if (jobRunsRes.error) throw jobRunsRes.error;
    if (recentEventsRes.error) throw recentEventsRes.error;

    const subscriptionRows = subscriptionStatusRes.data ?? [];
    const validationSummary = subscriptionRows.reduce<Record<string, number>>((acc, row) => {
      const key = row.validation_status ?? 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const outcomeRows = webhookOutcomesRes.data ?? [];
    const webhookOutcomes = outcomeRows.reduce<Record<string, number>>((acc, row) => {
      const key = row.outcome ?? 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const integrityIssues = integrityRes.error ? [] : (integrityRes.data ?? []);

    res.json({
      timestamp: new Date().toISOString(),
      webhook_stats: webhookStatsRes.data ?? [],
      webhook_outcomes: webhookOutcomes,
      subscription_validation: validationSummary,
      integrity_issues: integrityIssues,
      integrity_issue_count: integrityIssues.length,
      recent_job_runs: jobRunsRes.data ?? [],
      recent_subscription_events: recentEventsRes.data ?? [],
      subscription_event_insert_failures: getSubscriptionEventInsertFailureCount(),
    });
  } catch (err) {
    logError('Erro ao buscar billing stats', err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas de billing' });
  }
}

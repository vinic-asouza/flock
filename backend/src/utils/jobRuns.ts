import { supabaseAdmin } from '../services/supabase';
import { billingError, billingLog } from './structuredLogger';
import { sendOpsAlert } from '../services/opsAlertService';

export type JobRunStatus = 'running' | 'success' | 'failed';

/**
 * Executa um job cron com registro em job_runs (OB09).
 * `fn` deve retornar o número de linhas/registros afetados.
 */
export async function runTrackedJob(
  jobName: string,
  fn: () => Promise<number>
): Promise<number> {
  const startedAt = Date.now();

  const { data: run, error: insertError } = await supabaseAdmin
    .from('job_runs')
    .insert({ job_name: jobName, status: 'running' })
    .select('id')
    .single();

  if (insertError || !run) {
    billingError({
      event: 'job_run_insert_failed',
      job: jobName,
      error: insertError?.message ?? 'unknown',
    });
    // Executa mesmo sem persistir histórico
    return fn();
  }

  const runId = run.id as string;

  try {
    const rowsAffected = await fn();
    const duration_ms = Date.now() - startedAt;

    await supabaseAdmin
      .from('job_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: 'success' satisfies JobRunStatus,
        rows_affected: rowsAffected,
        duration_ms,
      })
      .eq('id', runId);

    billingLog({
      event: 'job_finished',
      job: jobName,
      rows_affected: rowsAffected,
      duration_ms,
      outcome: 'success',
    });

    return rowsAffected;
  } catch (err: unknown) {
    const duration_ms = Date.now() - startedAt;
    const errMsg = err instanceof Error ? err.message : String(err);

    await supabaseAdmin
      .from('job_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: 'failed' satisfies JobRunStatus,
        error_message: errMsg,
        duration_ms,
      })
      .eq('id', runId);

    billingError({
      event: 'job_finished',
      job: jobName,
      duration_ms,
      outcome: 'failed',
      error: errMsg,
    });

    sendOpsAlert(`Job falhou: ${jobName}`, { error: errMsg, duration_ms });
    throw err;
  }
}

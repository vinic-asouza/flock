import { supabaseAdmin } from './supabase';
import { getStripeHealthSnapshot, isStripeConfigured, type StripeHealthSnapshot } from './stripeHealth';
import {
  OPS_HEALTH_JOB_NAMES,
  billingJobsComponentStatus,
  emptyJobSnapshot,
  isOpsJobLastStatus,
  overallOpsHealthStatus,
  truncateErrorMessage,
  type OpsHealthJobName,
  type OpsHealthJobSnapshot,
  type OpsHealthStatus,
} from '../utils/opsHealth';

const JOB_RUN_COLUMNS =
  'job_name, status, started_at, finished_at, rows_affected, duration_ms, error_message';

export interface OpsHealthPayload {
  status: OpsHealthStatus;
  checked_at: string;
  api: { status: OpsHealthStatus };
  stripe: StripeHealthSnapshot;
  billing_jobs: {
    status: OpsHealthStatus;
    jobs: OpsHealthJobSnapshot[];
  };
}

interface JobRunRow {
  job_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  rows_affected: number | null;
  duration_ms: number | null;
  error_message: string | null;
}

async function fetchLatestJobRun(jobName: OpsHealthJobName): Promise<OpsHealthJobSnapshot> {
  const { data, error } = await supabaseAdmin
    .from('job_runs')
    .select(JOB_RUN_COLUMNS)
    .eq('job_name', jobName)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return emptyJobSnapshot(jobName);
  }

  const row = data as JobRunRow;
  return {
    job_name: jobName,
    last_status: isOpsJobLastStatus(row.status) ? row.status : null,
    started_at: row.started_at ?? null,
    finished_at: row.finished_at ?? null,
    duration_ms: row.duration_ms ?? null,
    rows_affected: row.rows_affected ?? null,
    error_message: truncateErrorMessage(row.error_message),
  };
}

function fallbackStripeSnapshot(): StripeHealthSnapshot {
  return {
    status: 'error',
    stripe_configured: isStripeConfigured(),
    stripe_reachable: false,
    last_webhook_processed_at: null,
  };
}

export async function getOpsHealthData(): Promise<OpsHealthPayload> {
  const [stripeResult, ...jobResults] = await Promise.allSettled([
    getStripeHealthSnapshot(),
    ...OPS_HEALTH_JOB_NAMES.map((name) => fetchLatestJobRun(name)),
  ]);

  const stripe: StripeHealthSnapshot =
    stripeResult.status === 'fulfilled' ? stripeResult.value : fallbackStripeSnapshot();

  const jobs = OPS_HEALTH_JOB_NAMES.map((name, index) => {
    const result = jobResults[index];
    if (result?.status === 'fulfilled') {
      return result.value;
    }
    return emptyJobSnapshot(name);
  });

  const jobsQueryFailed = jobResults.some((result) => result.status === 'rejected');
  const billingStatus = jobsQueryFailed ? 'error' : billingJobsComponentStatus(jobs);
  const api = { status: 'ok' as const };

  return {
    status: overallOpsHealthStatus([api.status, stripe.status, billingStatus]),
    checked_at: new Date().toISOString(),
    api,
    stripe,
    billing_jobs: {
      status: billingStatus,
      jobs,
    },
  };
}

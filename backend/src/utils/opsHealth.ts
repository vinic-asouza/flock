export type OpsHealthStatus = 'ok' | 'degraded' | 'error';
export type OpsJobLastStatus = 'success' | 'failed' | 'running' | null;

export const OPS_HEALTH_JOB_NAMES = [
  'cleanup_pending_subscriptions',
  'downgrade_expired_subscriptions',
  'cleanup_webhook_events',
  'validate_subscription_integrity',
  'check_subscription_expiration',
] as const;

export type OpsHealthJobName = (typeof OPS_HEALTH_JOB_NAMES)[number];

export const OPS_HEALTH_ERROR_MESSAGE_MAX = 200;
export const STRIPE_HEALTH_TIMEOUT_MS = 5000;

export interface OpsHealthJobSnapshot {
  job_name: OpsHealthJobName;
  last_status: OpsJobLastStatus;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  rows_affected: number | null;
  error_message: string | null;
}

export function stripeComponentStatus(
  configured: boolean,
  reachable: boolean
): OpsHealthStatus {
  if (!configured) {
    return 'error';
  }
  if (!reachable) {
    return 'degraded';
  }
  return 'ok';
}

export function billingJobsComponentStatus(
  jobs: Pick<OpsHealthJobSnapshot, 'last_status'>[]
): OpsHealthStatus {
  if (jobs.some((job) => job.last_status === 'failed')) {
    return 'error';
  }
  if (jobs.some((job) => job.last_status === 'running' || job.last_status === null)) {
    return 'degraded';
  }
  return 'ok';
}

export function overallOpsHealthStatus(components: OpsHealthStatus[]): OpsHealthStatus {
  if (components.some((status) => status === 'error')) {
    return 'error';
  }
  if (components.some((status) => status === 'degraded')) {
    return 'degraded';
  }
  return 'ok';
}

export function truncateErrorMessage(message: string | null | undefined): string | null {
  if (!message) {
    return null;
  }
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length <= OPS_HEALTH_ERROR_MESSAGE_MAX) {
    return trimmed;
  }
  return trimmed.slice(0, OPS_HEALTH_ERROR_MESSAGE_MAX);
}

export function emptyJobSnapshot(jobName: OpsHealthJobName): OpsHealthJobSnapshot {
  return {
    job_name: jobName,
    last_status: null,
    started_at: null,
    finished_at: null,
    duration_ms: null,
    rows_affected: null,
    error_message: null,
  };
}

export function isOpsJobLastStatus(
  value: string | null | undefined
): value is Exclude<OpsJobLastStatus, null> {
  return value === 'success' || value === 'failed' || value === 'running';
}

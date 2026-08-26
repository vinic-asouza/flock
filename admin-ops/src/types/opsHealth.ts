export type OpsHealthStatus = "ok" | "degraded" | "error";
export type OpsJobLastStatus = "success" | "failed" | "running" | null;

export type OpsHealthJobName =
  | "cleanup_pending_subscriptions"
  | "downgrade_expired_subscriptions"
  | "cleanup_webhook_events"
  | "validate_subscription_integrity"
  | "check_subscription_expiration";

export type OpsHealthJob = {
  job_name: OpsHealthJobName;
  last_status: OpsJobLastStatus;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  rows_affected: number | null;
  error_message: string | null;
};

export type OpsHealthResponse = {
  status: OpsHealthStatus;
  checked_at: string;
  api: {
    status: OpsHealthStatus;
  };
  stripe: {
    status: OpsHealthStatus;
    stripe_configured: boolean;
    stripe_reachable: boolean;
    last_webhook_processed_at: string | null;
  };
  billing_jobs: {
    status: OpsHealthStatus;
    jobs: OpsHealthJob[];
  };
};

import type {
  OpsHealthJobName,
  OpsHealthStatus,
  OpsJobLastStatus,
} from "@/types/opsHealth";

const HEALTH_STATUS_LABELS: Record<OpsHealthStatus, string> = {
  ok: "Ok",
  degraded: "Degradado",
  error: "Erro",
};

const JOB_NAME_LABELS: Record<OpsHealthJobName, string> = {
  cleanup_pending_subscriptions: "Limpeza de assinaturas pendentes",
  downgrade_expired_subscriptions: "Downgrade de assinaturas expiradas",
  cleanup_webhook_events: "Limpeza de webhooks",
  validate_subscription_integrity: "Integridade de assinaturas",
  check_subscription_expiration: "Avisos de expiração",
};

const JOB_LAST_STATUS_LABELS: Record<Exclude<OpsJobLastStatus, null>, string> = {
  success: "Sucesso",
  failed: "Falhou",
  running: "Em execução",
};

export function healthStatusLabel(status: OpsHealthStatus): string {
  return HEALTH_STATUS_LABELS[status];
}

export function jobNameLabel(jobName: string): string {
  return JOB_NAME_LABELS[jobName as OpsHealthJobName] ?? jobName;
}

export function jobLastStatusLabel(status: OpsJobLastStatus): string {
  if (!status) {
    return "Ainda não executou";
  }
  return JOB_LAST_STATUS_LABELS[status];
}

export function healthStatusBadgeClass(status: OpsHealthStatus): string {
  if (status === "ok") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (status === "degraded") {
    return "bg-amber-50 text-amber-800";
  }
  return "bg-red-50 text-red-800";
}

export function overallBannerClass(status: OpsHealthStatus): string {
  if (status === "ok") {
    return "border-emerald-200 bg-emerald-50";
  }
  if (status === "degraded") {
    return "border-amber-200 bg-amber-50";
  }
  return "border-red-200 bg-red-50";
}

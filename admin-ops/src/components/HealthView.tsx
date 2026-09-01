"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Activity, Cog, RefreshCw, Server, Webhook, type LucideIcon } from "lucide-react";
import { opsApi } from "@/services/api";
import type { OpsHealthResponse, OpsHealthStatus } from "@/types/opsHealth";
import { formatOpsReadError } from "@/lib/opsReadErrors";
import { formatDateTime } from "@/lib/opsFormat";
import {
  healthStatusLabel,
  jobLastStatusLabel,
  jobNameLabel,
  overallBannerClass,
  staleHealthErrorDetails,
} from "@/lib/opsHealthLabels";
import {
  OpsBadge,
  OpsButton,
  OpsError,
  OpsHealthSkeleton,
  OpsPage,
  OpsPageHeader,
  OpsPanel,
  OpsTable,
  OpsTableHead,
  OpsTd,
  OpsTh,
} from "@/components/ui";

function formatDurationMs(ms: number | null): string {
  if (ms === null) {
    return "—";
  }
  return `${ms.toLocaleString("pt-BR")} ms`;
}

function healthTone(
  status: OpsHealthStatus
): "success" | "warning" | "danger" {
  if (status === "ok") {
    return "success";
  }
  if (status === "degraded") {
    return "warning";
  }
  return "danger";
}

function HealthCard({
  title,
  status,
  icon: Icon,
  children,
}: {
  title: string;
  status: OpsHealthStatus;
  icon: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted" aria-hidden />
          <h2 className="text-sm font-semibold text-primary">{title}</h2>
        </div>
        <OpsBadge tone={healthTone(status)}>
          {healthStatusLabel(status)}
        </OpsBadge>
      </div>
      {children ? (
        <div className="mt-3 space-y-1 text-sm text-foreground">{children}</div>
      ) : null}
    </section>
  );
}

export function HealthView() {
  const [health, setHealth] = useState<OpsHealthResponse | null>(null);
  const [error, setError] = useState<{ title: string; details?: string } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await opsApi.getHealth();
      setHealth(data);
    } catch (err) {
      setError(formatOpsReadError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <OpsPage>
      <OpsPageHeader
        title="Saúde"
        description="Status da API, do Stripe e dos jobs de billing. Somente leitura — suficiente para suporte, sem APM."
        actions={
          <OpsButton
            type="button"
            onClick={() => void load()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading && health ? "animate-spin" : ""}`}
              aria-hidden
            />
            {isLoading && health ? "Atualizando…" : "Atualizar"}
          </OpsButton>
        }
      />

      {isLoading && !health ? (
        <OpsHealthSkeleton />
      ) : (
        <>
          {error ? (
            <OpsError
              title={error.title}
              details={staleHealthErrorDetails(error.details, Boolean(health))}
            />
          ) : null}
          {health ? (
            <>
              <div
                className={`rounded-lg border px-5 py-4 ${overallBannerClass(health.status)}`}
                role="status"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-primary" aria-hidden />
                    <p className="text-sm font-semibold text-primary">
                      Status geral
                    </p>
                    <OpsBadge tone={healthTone(health.status)}>
                      {healthStatusLabel(health.status)}
                    </OpsBadge>
                  </div>
                  <p className="text-xs text-muted">
                    Verificado em {formatDateTime(health.checked_at)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <HealthCard title="API" status={health.api.status} icon={Server}>
                  <p className="text-muted">
                    Processo da API respondeu a esta consulta.
                  </p>
                </HealthCard>
                <HealthCard title="Stripe" status={health.stripe.status} icon={Webhook}>
                  <p>
                    Configurado:{" "}
                    <span className="font-medium">
                      {health.stripe.stripe_configured ? "Sim" : "Não"}
                    </span>
                  </p>
                  <p>
                    Alcançável:{" "}
                    <span className="font-medium">
                      {health.stripe.stripe_reachable ? "Sim" : "Não"}
                    </span>
                  </p>
                  <p>
                    Último webhook:{" "}
                    <span className="font-medium">
                      {formatDateTime(health.stripe.last_webhook_processed_at)}
                    </span>
                  </p>
                </HealthCard>
                <HealthCard
                  title="Jobs de billing"
                  status={health.billing_jobs.status}
                  icon={Cog}
                >
                  <p className="text-muted">
                    Última execução de cada cron conhecido.
                  </p>
                </HealthCard>
              </div>

              <OpsPanel title="Jobs de billing" padded={false}>
                <OpsTable embedded>
                  <OpsTableHead>
                    <tr>
                      <OpsTh>Job</OpsTh>
                      <OpsTh fit>Status</OpsTh>
                      <OpsTh fit>Início</OpsTh>
                      <OpsTh fit>Duração</OpsTh>
                      <OpsTh fit>Linhas</OpsTh>
                      <OpsTh>Erro</OpsTh>
                    </tr>
                  </OpsTableHead>
                  <tbody>
                    {health.billing_jobs.jobs.map((job) => (
                      <tr
                        key={job.job_name}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <OpsTd className="max-w-[16rem]">
                          <p className="font-medium text-foreground">
                            {jobNameLabel(job.job_name)}
                          </p>
                          <p className="truncate text-xs text-muted" title={job.job_name}>
                            {job.job_name}
                          </p>
                        </OpsTd>
                        <OpsTd fit>
                          {jobLastStatusLabel(job.last_status)}
                        </OpsTd>
                        <OpsTd fit>
                          {formatDateTime(job.started_at)}
                        </OpsTd>
                        <OpsTd fit>
                          {formatDurationMs(job.duration_ms)}
                        </OpsTd>
                        <OpsTd fit className="tabular-nums">
                          {job.rows_affected === null
                            ? "—"
                            : job.rows_affected.toLocaleString("pt-BR")}
                        </OpsTd>
                        <OpsTd
                          className="max-w-[14rem] truncate text-muted"
                          title={job.error_message || undefined}
                        >
                          {job.error_message || "—"}
                        </OpsTd>
                      </tr>
                    ))}
                  </tbody>
                </OpsTable>
              </OpsPanel>
            </>
          ) : null}
        </>
      )}
    </OpsPage>
  );
}

"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { opsApi } from "@/services/api";
import type { OpsHealthResponse, OpsHealthStatus } from "@/types/opsHealth";
import { formatOpsReadError } from "@/lib/opsReadErrors";
import { formatDateTime } from "@/lib/opsFormat";
import {
  jobLastStatusLabel,
  jobNameLabel,
  overallBannerClass,
} from "@/lib/opsHealthLabels";
import { HealthStatusBadge } from "@/components/HealthStatusBadge";
import { PageFrame, Panel } from "@/components/PageFrame";
import { ErrorState, LoadingState } from "@/components/ConsoleState";

function formatDurationMs(ms: number | null): string {
  if (ms === null) {
    return "—";
  }
  return `${ms.toLocaleString("pt-BR")} ms`;
}

function HealthCard({
  title,
  status,
  children,
}: {
  title: string;
  status: OpsHealthStatus;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-primary">{title}</h2>
        <HealthStatusBadge status={status} />
      </div>
      {children ? <div className="mt-3 space-y-1 text-sm text-foreground">{children}</div> : null}
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
      setHealth(null);
      setError(formatOpsReadError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageFrame
      title="Saúde"
      description="Status da API, do Stripe e dos jobs de billing. Somente leitura — suficiente para suporte, sem APM."
      actions={
        <button
          type="button"
          onClick={() => void load()}
          disabled={isLoading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isLoading && health ? "Atualizando…" : "Atualizar"}
        </button>
      }
    >
      {isLoading && !health ? (
        <LoadingState label="Carregando saúde dos sistemas…" />
      ) : error ? (
        <ErrorState title={error.title} details={error.details} />
      ) : health ? (
        <>
          <div
            className={`rounded-lg border px-5 py-4 ${overallBannerClass(health.status)}`}
            role="status"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-primary">Status geral</p>
                <HealthStatusBadge status={health.status} />
              </div>
              <p className="text-xs text-muted">
                Verificado em {formatDateTime(health.checked_at)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <HealthCard title="API" status={health.api.status}>
              <p className="text-muted">
                Processo da API respondeu a esta consulta.
              </p>
            </HealthCard>
            <HealthCard title="Stripe" status={health.stripe.status}>
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
            <HealthCard title="Jobs de billing" status={health.billing_jobs.status}>
              <p className="text-muted">
                Última execução de cada cron conhecido.
              </p>
            </HealthCard>
          </div>

          <Panel title="Jobs de billing">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-4 font-medium">Job</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Início</th>
                    <th className="py-2 pr-4 font-medium">Duração</th>
                    <th className="py-2 pr-4 font-medium">Linhas</th>
                    <th className="py-2 font-medium">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {health.billing_jobs.jobs.map((job) => (
                    <tr
                      key={job.job_name}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground">
                          {jobNameLabel(job.job_name)}
                        </p>
                        <p className="text-xs text-muted">{job.job_name}</p>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {jobLastStatusLabel(job.last_status)}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {formatDateTime(job.started_at)}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {formatDurationMs(job.duration_ms)}
                      </td>
                      <td className="py-3 pr-4 tabular-nums">
                        {job.rows_affected === null
                          ? "—"
                          : job.rows_affected.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 max-w-xs break-words text-muted">
                        {job.error_message || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}
    </PageFrame>
  );
}

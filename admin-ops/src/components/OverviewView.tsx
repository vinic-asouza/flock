"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { opsApi } from "@/services/api";
import type { OpsOverview } from "@/types/opsChurches";
import { formatOpsReadError } from "@/lib/opsReadErrors";
import {
  planTypeLabel,
  sortBreakdownEntries,
  subscriptionStatusLabel,
} from "@/lib/opsChurchLabels";
import {
  churchesListHref,
  isFilterableBreakdownKey,
  type OpsChurchPlanType,
  type OpsChurchSubscriptionStatus,
} from "@/lib/opsChurchQuery";
import { PageFrame, Panel } from "@/components/PageFrame";
import { EmptyState, ErrorState, LoadingState } from "@/components/ConsoleState";

function BreakdownList({
  title,
  entries,
  kind,
}: {
  title: string;
  entries: Record<string, number>;
  kind: "plan" | "status";
}) {
  const rows = sortBreakdownEntries(Object.entries(entries), kind);

  if (rows.length === 0) {
    return (
      <Panel title={title}>
        <EmptyState>Nenhum recorte disponível.</EmptyState>
      </Panel>
    );
  }

  return (
    <Panel title={title}>
      <ul className="divide-y divide-gray-100">
        {rows.map(([key, count]) => {
          const label =
            kind === "plan"
              ? planTypeLabel(key)
              : subscriptionStatusLabel(key);
          const filterable = isFilterableBreakdownKey(key, kind);
          const href =
            kind === "plan"
              ? churchesListHref({
                  plan_type: key as OpsChurchPlanType,
                })
              : churchesListHref({
                  subscription_status: key as OpsChurchSubscriptionStatus,
                });

          return (
            <li
              key={`${kind}-${key}`}
              className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
            >
              {filterable ? (
                <Link
                  href={href}
                  className="text-sm text-primary underline-offset-2 hover:underline"
                >
                  {label}
                </Link>
              ) : (
                <span className="text-sm text-foreground">{label}</span>
              )}
              <span className="text-sm font-medium tabular-nums text-primary">
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function OverviewView() {
  const [overview, setOverview] = useState<OpsOverview | null>(null);
  const [error, setError] = useState<{ title: string; details?: string } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await opsApi.getOverview();
        if (!cancelled) {
          setOverview(data);
        }
      } catch (err) {
        if (!cancelled) {
          setOverview(null);
          setError(formatOpsReadError(err));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageFrame
      title="Overview"
      description="Totais comerciais das Igrejas (clientes SaaS). Somente leitura — não é o Painel da Igreja."
    >
      {isLoading ? (
        <LoadingState label="Carregando overview…" />
      ) : error ? (
        <ErrorState title={error.title} details={error.details} />
      ) : overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/churches"
              className="rounded-lg border border-gray-200 bg-white p-5 hover:border-primary/30"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Igrejas
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-primary">
                {overview.total}
              </p>
            </Link>
            <Link
              href={churchesListHref({ commercially_active: true })}
              className="rounded-lg border border-gray-200 bg-white p-5 hover:border-primary/30"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Comercialmente ativas
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-primary">
                {overview.commercially_active}
              </p>
            </Link>
            <Link
              href={churchesListHref({ commercially_active: false })}
              className="rounded-lg border border-gray-200 bg-white p-5 hover:border-primary/30"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Comercialmente inativas
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-primary">
                {overview.commercially_inactive}
              </p>
            </Link>
          </div>

          {overview.total === 0 ? (
            <EmptyState>Nenhuma Igreja cadastrada ainda.</EmptyState>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <BreakdownList
                title="Por plano"
                entries={overview.by_plan_type}
                kind="plan"
              />
              <BreakdownList
                title="Por status de assinatura"
                entries={overview.by_subscription_status}
                kind="status"
              />
            </div>
          )}
        </>
      ) : null}
    </PageFrame>
  );
}

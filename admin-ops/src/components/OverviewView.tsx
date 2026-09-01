"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Church,
  CircleCheck,
  CircleMinus,
  ClipboardList,
  HeartPulse,
} from "lucide-react";
import { opsApi } from "@/services/api";
import type { OpsOverview } from "@/types/opsChurches";
import type { OpsHealthResponse } from "@/types/opsHealth";
import { formatOpsReadError } from "@/lib/opsReadErrors";
import {
  planTypeLabel,
  sortBreakdownEntries,
  subscriptionStatusLabel,
} from "@/lib/opsChurchLabels";
import { healthStatusLabel } from "@/lib/opsHealthLabels";
import { formatDateTime } from "@/lib/opsFormat";
import {
  churchesListHref,
  isFilterableBreakdownKey,
  type OpsChurchPlanType,
  type OpsChurchSubscriptionStatus,
} from "@/lib/opsChurchQuery";
import { DEFAULT_WAITLIST_LIST_QUERY } from "@/lib/opsWaitlistQuery";
import {
  OpsEmpty,
  OpsError,
  OpsOverviewSkeleton,
  OpsPage,
  OpsPageHeader,
  OpsPanel,
  OpsStatCard,
} from "@/components/ui";

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
      <OpsPanel title={title}>
        <OpsEmpty>Nenhum recorte disponível.</OpsEmpty>
      </OpsPanel>
    );
  }

  return (
    <OpsPanel title={title}>
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
                  className="text-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
    </OpsPanel>
  );
}

export function OverviewView() {
  const [overview, setOverview] = useState<OpsOverview | null>(null);
  const [waitlistTotal, setWaitlistTotal] = useState<number | null>(null);
  const [health, setHealth] = useState<OpsHealthResponse | null>(null);
  const [overviewError, setOverviewError] = useState<{
    title: string;
    details?: string;
  } | null>(null);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const [overviewResult, waitlistResult, healthResult] =
        await Promise.allSettled([
          opsApi.getOverview(),
          opsApi.listWaitlist({
            ...DEFAULT_WAITLIST_LIST_QUERY,
            limit: 1,
          }),
          opsApi.getHealth(),
        ]);

      if (cancelled) {
        return;
      }

      if (overviewResult.status === "fulfilled") {
        setOverview(overviewResult.value);
        setOverviewError(null);
      } else {
        setOverview(null);
        setOverviewError(formatOpsReadError(overviewResult.reason));
      }

      if (waitlistResult.status === "fulfilled") {
        setWaitlistTotal(waitlistResult.value.pagination.total);
        setWaitlistError(null);
      } else {
        setWaitlistTotal(null);
        setWaitlistError(formatOpsReadError(waitlistResult.reason).title);
      }

      if (healthResult.status === "fulfilled") {
        setHealth(healthResult.value);
        setHealthError(null);
      } else {
        setHealth(null);
        setHealthError(formatOpsReadError(healthResult.reason).title);
      }

      setIsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <OpsPage>
      <OpsPageHeader
        title="Visão geral"
        description="Totais comerciais das Igrejas, Lista de espera e saúde da plataforma. Somente leitura."
      />
      {isLoading ? (
        <OpsOverviewSkeleton />
      ) : (
        <>
          {overviewError ? (
            <OpsError title={overviewError.title} details={overviewError.details} />
          ) : overview ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <OpsStatCard
                href="/churches"
                label="Igrejas"
                value={overview.total}
                icon={Church}
              />
              <OpsStatCard
                href={churchesListHref({ commercially_active: true })}
                label="Comercialmente ativas"
                value={overview.commercially_active}
                icon={CircleCheck}
              />
              <OpsStatCard
                href={churchesListHref({ commercially_active: false })}
                label="Comercialmente inativas"
                value={overview.commercially_inactive}
                icon={CircleMinus}
              />
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <OpsStatCard
              href="/waitlist"
              label="Lista de espera"
              value={waitlistTotal ?? "—"}
              hint={
                waitlistError
                  ? waitlistError
                  : waitlistTotal === 1
                    ? "lead na fila"
                    : "leads na fila"
              }
              icon={ClipboardList}
            />
            <OpsStatCard
              href="/health"
              label="Saúde"
              value={health ? healthStatusLabel(health.status) : "—"}
              valueClassName={
                health?.status === "ok"
                  ? "text-emerald-700"
                  : health?.status === "degraded"
                    ? "text-amber-700"
                    : health
                      ? "text-red-700"
                      : undefined
              }
              hint={
                healthError
                  ? healthError
                  : health
                    ? `Verificado em ${formatDateTime(health.checked_at)}`
                    : undefined
              }
              icon={HeartPulse}
            />
          </div>

          {overview && overview.total === 0 ? (
            <OpsEmpty>Nenhuma Igreja cadastrada ainda.</OpsEmpty>
          ) : overview ? (
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
          ) : null}
        </>
      )}
    </OpsPage>
  );
}

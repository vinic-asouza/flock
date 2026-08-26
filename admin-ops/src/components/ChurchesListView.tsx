"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { opsApi } from "@/services/api";
import type { OpsChurchListResponse } from "@/types/opsChurches";
import { formatOpsReadError } from "@/lib/opsReadErrors";
import {
  planTypeLabel,
  subscriptionStatusLabel,
} from "@/lib/opsChurchLabels";
import {
  OPS_CHURCH_PLAN_TYPES,
  OPS_CHURCH_SUBSCRIPTION_STATUSES,
  churchesListHref,
  hasActiveChurchFilters,
  parseChurchListSearchParams,
  type OpsChurchListQuery,
  type OpsChurchPlanType,
  type OpsChurchSortField,
  type OpsChurchSubscriptionStatus,
} from "@/lib/opsChurchQuery";
import { formatCnpj } from "@/lib/opsFormat";
import { PageFrame, Panel } from "@/components/PageFrame";
import { CommercialBadge } from "@/components/CommercialBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ConsoleState";

function hrefFrom(
  current: OpsChurchListQuery,
  patch: Partial<OpsChurchListQuery>
): string {
  return churchesListHref({ ...current, ...patch });
}

export function ChurchesListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const query = useMemo(
    () => parseChurchListSearchParams(new URLSearchParams(searchKey)),
    [searchKey]
  );

  const [qInput, setQInput] = useState(query.q ?? "");
  const [result, setResult] = useState<OpsChurchListResponse | null>(null);
  const [error, setError] = useState<{ title: string; details?: string } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setQInput(query.q ?? "");
  }, [query.q]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await opsApi.listChurches(query);
        if (!cancelled) {
          setResult(data);
        }
      } catch (err) {
        if (!cancelled) {
          setResult(null);
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
  }, [searchKey, query]);

  const go = (patch: Partial<OpsChurchListQuery>) => {
    router.push(hrefFrom(query, patch));
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = qInput.trim().slice(0, 80);
    go({ q: q || undefined, page: 1 });
  };

  const pagination = result?.pagination;
  const filtered = hasActiveChurchFilters(query);

  return (
    <PageFrame
      title="Igrejas"
      description="Busca e filtros sobre as Igrejas da plataforma. Clique em uma linha para abrir a ficha."
    >
      <Panel>
        <form
          onSubmit={onSearch}
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-6"
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-primary lg:col-span-2">
            Busca
            <input
              type="search"
              value={qInput}
              onChange={(event) => setQInput(event.target.value)}
              maxLength={80}
              placeholder="Nome ou CNPJ"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-primary">
            Plano
            <select
              value={query.plan_type ?? ""}
              onChange={(event) =>
                go({
                  plan_type: (event.target.value || undefined) as
                    | OpsChurchPlanType
                    | undefined,
                  page: 1,
                })
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {OPS_CHURCH_PLAN_TYPES.map((plan) => (
                <option key={plan} value={plan}>
                  {planTypeLabel(plan)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-primary">
            Status da assinatura
            <select
              value={query.subscription_status ?? ""}
              onChange={(event) =>
                go({
                  subscription_status: (event.target.value || undefined) as
                    | OpsChurchSubscriptionStatus
                    | undefined,
                  page: 1,
                })
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {OPS_CHURCH_SUBSCRIPTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {subscriptionStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-primary">
            Situação comercial
            <select
              value={
                typeof query.commercially_active === "boolean"
                  ? String(query.commercially_active)
                  : ""
              }
              onChange={(event) => {
                const value = event.target.value;
                go({
                  commercially_active:
                    value === "true"
                      ? true
                      : value === "false"
                        ? false
                        : undefined,
                  page: 1,
                });
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              <option value="true">Comercialmente ativas</option>
              <option value="false">Comercialmente inativas</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-primary">
            Ordenar
            <select
              value={`${query.sort_by}:${query.sort_order}`}
              onChange={(event) => {
                const [sort_by, sort_order] = event.target.value.split(":") as [
                  OpsChurchSortField,
                  "asc" | "desc",
                ];
                go({ sort_by, sort_order, page: 1 });
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="created_at:desc">Mais recentes</option>
              <option value="created_at:asc">Mais antigas</option>
              <option value="name:asc">Nome A–Z</option>
              <option value="name:desc">Nome Z–A</option>
              <option value="cnpj:asc">CNPJ A–Z</option>
              <option value="cnpj:desc">CNPJ Z–A</option>
            </select>
          </label>
          <div className="flex items-end gap-2 lg:col-span-6">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Buscar
            </button>
            {filtered ? (
              <Link
                href="/churches"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-primary"
              >
                Limpar filtros
              </Link>
            ) : null}
          </div>
        </form>
      </Panel>

      {isLoading ? (
        <LoadingState label="Carregando Igrejas…" />
      ) : error ? (
        <ErrorState title={error.title} details={error.details} />
      ) : result && result.data.length === 0 ? (
        <EmptyState>
          {filtered
            ? "Nenhuma Igreja encontrada para estes filtros."
            : "Nenhuma Igreja cadastrada ainda."}
        </EmptyState>
      ) : result ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Igreja</th>
                  <th className="px-4 py-3 font-medium">CNPJ</th>
                  <th className="px-4 py-3 font-medium">Plano</th>
                  <th className="px-4 py-3 font-medium">Assinatura</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Membros ativos
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((church) => (
                  <tr key={church.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/churches/${church.id}`}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {church.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {formatCnpj(church.cnpj)}
                    </td>
                    <td className="px-4 py-3">
                      {planTypeLabel(church.plan_type)}
                    </td>
                    <td className="px-4 py-3">
                      {subscriptionStatusLabel(church.subscription_status)}
                    </td>
                    <td className="px-4 py-3">
                      <CommercialBadge active={church.commercially_active} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {church.members_active_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-4 text-sm">
              <p className="text-muted">
                Página {pagination.page} de {pagination.totalPages} ·{" "}
                {pagination.total} Igreja{pagination.total === 1 ? "" : "s"}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => go({ page: pagination.page - 1 })}
                  className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={!pagination.hasNextPage}
                  onClick={() => go({ page: pagination.page + 1 })}
                  className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          ) : pagination ? (
            <p className="text-sm text-muted">
              {pagination.total} Igreja{pagination.total === 1 ? "" : "s"}
            </p>
          ) : null}
        </>
      ) : null}
    </PageFrame>
  );
}

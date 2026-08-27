"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { opsApi } from "@/services/api";
import type { OpsWaitlistListResponse } from "@/types/opsWaitlist";
import { formatOpsReadError } from "@/lib/opsReadErrors";
import { waitlistPlanLabel } from "@/lib/opsWaitlistLabels";
import {
  OPS_WAITLIST_PLANS,
  hasActiveWaitlistFilters,
  parseWaitlistListSearchParams,
  waitlistListHref,
  type OpsWaitlistListQuery,
  type OpsWaitlistPlan,
} from "@/lib/opsWaitlistQuery";
import { displayValue, formatDateTime, formatPhone } from "@/lib/opsFormat";
import { PageFrame, Panel } from "@/components/PageFrame";
import { EmptyState, ErrorState, LoadingState } from "@/components/ConsoleState";

function hrefFrom(
  current: OpsWaitlistListQuery,
  patch: Partial<OpsWaitlistListQuery>
): string {
  return waitlistListHref({ ...current, ...patch });
}

function WaitlistMessage({ message }: { message: string | null }) {
  const text = message?.trim();
  if (!text) {
    return <span className="text-muted">—</span>;
  }

  return (
    <details className="max-w-xs">
      <summary
        className="cursor-pointer truncate text-sm text-primary"
        title={text}
      >
        {text}
      </summary>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{text}</p>
    </details>
  );
}

export function WaitlistListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const query = useMemo(
    () => parseWaitlistListSearchParams(new URLSearchParams(searchKey)),
    [searchKey]
  );

  const [qInput, setQInput] = useState(query.q ?? "");
  const [result, setResult] = useState<OpsWaitlistListResponse | null>(null);
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
        const data = await opsApi.listWaitlist(query);
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

  const go = (patch: Partial<OpsWaitlistListQuery>) => {
    router.push(hrefFrom(query, patch));
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = qInput.trim().slice(0, 80);
    go({ q: q || undefined, page: 1 });
  };

  const pagination = result?.pagination;
  const filtered = hasActiveWaitlistFilters(query);

  return (
    <PageFrame
      title="Lista de espera"
      description="Leads captados na landing. Somente leitura — sem editar, apagar ou converter em Igreja."
    >
      <Panel>
        <form
          onSubmit={onSearch}
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-primary lg:col-span-2">
            Busca
            <input
              type="search"
              value={qInput}
              onChange={(event) => setQInput(event.target.value)}
              maxLength={80}
              placeholder="Nome, e-mail ou igreja"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-primary">
            Plano de interesse
            <select
              value={query.plan ?? ""}
              onChange={(event) =>
                go({
                  plan: (event.target.value || undefined) as
                    | OpsWaitlistPlan
                    | undefined,
                  page: 1,
                })
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {OPS_WAITLIST_PLANS.map((plan) => (
                <option key={plan} value={plan}>
                  {waitlistPlanLabel(plan)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-primary">
            Ordenar
            <select
              value={`${query.sort_by}:${query.sort_order}`}
              onChange={(event) => {
                const [, sort_order] = event.target.value.split(":") as [
                  string,
                  "asc" | "desc",
                ];
                go({ sort_by: "created_at", sort_order, page: 1 });
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="created_at:desc">Mais recentes</option>
              <option value="created_at:asc">Mais antigos</option>
            </select>
          </label>
          <div className="flex items-end gap-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Buscar
            </button>
            {filtered ? (
              <Link
                href="/waitlist"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-primary"
              >
                Limpar filtros
              </Link>
            ) : null}
          </div>
        </form>
      </Panel>

      {isLoading ? (
        <LoadingState label="Carregando Lista de espera…" />
      ) : error ? (
        <ErrorState title={error.title} details={error.details} />
      ) : result && result.data.length === 0 ? (
        <EmptyState>
          {filtered
            ? "Nenhum lead encontrado para estes filtros."
            : "Nenhum lead na Lista de espera."}
        </EmptyState>
      ) : result ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Telefone</th>
                  <th className="px-4 py-3 font-medium">Igreja</th>
                  <th className="px-4 py-3 font-medium">Cidade</th>
                  <th className="px-4 py-3 font-medium">Plano</th>
                  <th className="px-4 py-3 font-medium">Cadastro</th>
                  <th className="px-4 py-3 font-medium">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-primary">
                      {lead.name}
                    </td>
                    <td className="px-4 py-3">{lead.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatPhone(lead.phone)}
                    </td>
                    <td className="px-4 py-3">{lead.church_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {displayValue(lead.city)}
                      {lead.state ? `/${lead.state}` : ""}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {waitlistPlanLabel(lead.plan)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateTime(lead.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <WaitlistMessage message={lead.message} />
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
                {pagination.total} lead{pagination.total === 1 ? "" : "s"}
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
              {pagination.total} lead{pagination.total === 1 ? "" : "s"}
            </p>
          ) : null}
        </>
      ) : null}
    </PageFrame>
  );
}

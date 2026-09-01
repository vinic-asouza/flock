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
import {
  OpsButton,
  OpsEmpty,
  OpsError,
  OpsFilterBar,
  OpsInput,
  OpsPage,
  OpsPageHeader,
  OpsPagination,
  OpsSelect,
  OpsTable,
  OpsTableHead,
  OpsTableSkeleton,
  OpsTd,
  OpsTh,
} from "@/components/ui";

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
    <OpsPage>
      <OpsPageHeader
        title="Lista de espera"
        description="Leads captados na landing. Somente leitura — sem editar, apagar ou converter em Igreja."
      />

      <OpsFilterBar>
        <form
          onSubmit={onSearch}
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"
        >
          <OpsInput
            label="Busca"
            type="search"
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
            maxLength={80}
            placeholder="Nome, e-mail ou igreja"
            className="lg:col-span-2"
          />
          <OpsSelect
            label="Plano de interesse"
            value={query.plan ?? ""}
            onChange={(event) =>
              go({
                plan: (event.target.value || undefined) as
                  | OpsWaitlistPlan
                  | undefined,
                page: 1,
              })
            }
          >
            <option value="">Todos</option>
            {OPS_WAITLIST_PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {waitlistPlanLabel(plan)}
              </option>
            ))}
          </OpsSelect>
          <OpsSelect
            label="Ordenar"
            value={`${query.sort_by}:${query.sort_order}`}
            onChange={(event) => {
              const [, sort_order] = event.target.value.split(":") as [
                string,
                "asc" | "desc",
              ];
              go({ sort_by: "created_at", sort_order, page: 1 });
            }}
          >
            <option value="created_at:desc">Mais recentes</option>
            <option value="created_at:asc">Mais antigos</option>
          </OpsSelect>
          <div className="flex items-end gap-2 lg:col-span-4">
            <OpsButton type="submit">Buscar</OpsButton>
            {filtered ? (
              <Link
                href="/waitlist"
                className="inline-flex min-h-11 items-center rounded-md border border-gray-300 px-4 text-sm font-medium text-primary hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Limpar filtros
              </Link>
            ) : null}
          </div>
        </form>
      </OpsFilterBar>

      {isLoading ? (
        <OpsTableSkeleton />
      ) : error ? (
        <OpsError title={error.title} details={error.details} />
      ) : result && result.data.length === 0 ? (
        <OpsEmpty>
          {filtered
            ? "Nenhum lead encontrado para estes filtros."
            : "Nenhum lead na Lista de espera."}
        </OpsEmpty>
      ) : result ? (
        <>
          <OpsTable>
            <OpsTableHead>
              <tr>
                <OpsTh>Nome</OpsTh>
                <OpsTh>E-mail</OpsTh>
                <OpsTh>Telefone</OpsTh>
                <OpsTh>Igreja</OpsTh>
                <OpsTh>Cidade</OpsTh>
                <OpsTh>Plano</OpsTh>
                <OpsTh>Cadastro</OpsTh>
                <OpsTh>Mensagem</OpsTh>
              </tr>
            </OpsTableHead>
            <tbody>
              {result.data.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <OpsTd className="font-medium text-primary">{lead.name}</OpsTd>
                  <OpsTd>{lead.email}</OpsTd>
                  <OpsTd className="whitespace-nowrap">
                    {formatPhone(lead.phone)}
                  </OpsTd>
                  <OpsTd>{lead.church_name}</OpsTd>
                  <OpsTd className="whitespace-nowrap">
                    {displayValue(lead.city)}
                    {lead.state ? `/${lead.state}` : ""}
                  </OpsTd>
                  <OpsTd className="whitespace-nowrap">
                    {waitlistPlanLabel(lead.plan)}
                  </OpsTd>
                  <OpsTd className="whitespace-nowrap">
                    {formatDateTime(lead.created_at)}
                  </OpsTd>
                  <OpsTd>
                    <WaitlistMessage message={lead.message} />
                  </OpsTd>
                </tr>
              ))}
            </tbody>
          </OpsTable>

          {pagination ? (
            <OpsPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              noun={{ one: "lead", other: "leads" }}
              hasPrevPage={pagination.hasPrevPage}
              hasNextPage={pagination.hasNextPage}
              onPrev={() => go({ page: pagination.page - 1 })}
              onNext={() => go({ page: pagination.page + 1 })}
            />
          ) : null}
        </>
      ) : null}
    </OpsPage>
  );
}

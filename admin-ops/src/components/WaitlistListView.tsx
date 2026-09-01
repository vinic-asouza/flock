"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Search, X } from "lucide-react";
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
  OpsButtonLink,
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
    <details className="group max-w-[14rem]">
      <summary
        className="flex cursor-pointer list-none items-center gap-1 text-sm text-primary [&::-webkit-details-marker]:hidden"
        title={text}
      >
        <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
        <span className="truncate">{text}</span>
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
            <OpsButton type="submit">
              <Search className="h-4 w-4" aria-hidden />
              Buscar
            </OpsButton>
            {filtered ? (
              <OpsButtonLink href="/waitlist">
                <X className="h-4 w-4" aria-hidden />
                Limpar filtros
              </OpsButtonLink>
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
                <OpsTh fit>Telefone</OpsTh>
                <OpsTh>Igreja</OpsTh>
                <OpsTh fit>Cidade</OpsTh>
                <OpsTh fit>Plano</OpsTh>
                <OpsTh fit>Cadastro</OpsTh>
                <OpsTh fit>Mensagem</OpsTh>
              </tr>
            </OpsTableHead>
            <tbody>
              {result.data.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <OpsTd className="max-w-[12rem] truncate font-medium text-primary" title={lead.name}>
                    {lead.name}
                  </OpsTd>
                  <OpsTd className="max-w-[14rem] truncate" title={lead.email}>
                    {lead.email}
                  </OpsTd>
                  <OpsTd fit>{formatPhone(lead.phone)}</OpsTd>
                  <OpsTd className="max-w-[12rem] truncate" title={lead.church_name}>
                    {lead.church_name}
                  </OpsTd>
                  <OpsTd fit>
                    {displayValue(lead.city)}
                    {lead.state ? `/${lead.state}` : ""}
                  </OpsTd>
                  <OpsTd fit>{waitlistPlanLabel(lead.plan)}</OpsTd>
                  <OpsTd fit>{formatDateTime(lead.created_at)}</OpsTd>
                  <OpsTd fit>
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

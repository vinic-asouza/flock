"use client";

import { FormEvent, useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { opsApi } from "@/services/api";
import type { OpsChurchListResponse } from "@/types/opsChurches";
import { formatOpsReadError } from "@/lib/opsReadErrors";
import {
  commerciallyActiveLabel,
  planTypeLabel,
  subscriptionStatusLabel,
} from "@/lib/opsChurchLabels";
import {
  OPS_CHURCH_PLAN_TYPES,
  OPS_CHURCH_SUBSCRIPTION_STATUSES,
  churchDetailHref,
  churchesListHref,
  hasActiveChurchFilters,
  parseChurchListSearchParams,
  type OpsChurchListQuery,
  type OpsChurchPlanType,
  type OpsChurchSortField,
  type OpsChurchSubscriptionStatus,
} from "@/lib/opsChurchQuery";
import { formatCnpj } from "@/lib/opsFormat";
import {
  OpsBadge,
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
  current: OpsChurchListQuery,
  patch: Partial<OpsChurchListQuery>
): string {
  return churchesListHref({ ...current, ...patch });
}

function onChurchRowClick(
  event: MouseEvent<HTMLTableRowElement>,
  href: string,
  navigate: (href: string) => void
) {
  if (event.defaultPrevented || event.button !== 0) {
    return;
  }
  if ((event.target as HTMLElement).closest("a")) {
    return;
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    window.open(href, "_blank", "noopener,noreferrer");
    return;
  }
  navigate(href);
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
    <OpsPage>
      <OpsPageHeader
        title="Igrejas"
        description="Busca e filtros sobre as Igrejas da plataforma. Clique em uma linha para abrir a ficha."
      />

      <OpsFilterBar>
        <form
          onSubmit={onSearch}
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-6"
        >
          <OpsInput
            label="Busca"
            type="search"
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
            maxLength={80}
            placeholder="Nome ou CNPJ"
            className="lg:col-span-2"
          />
          <OpsSelect
            label="Plano"
            value={query.plan_type ?? ""}
            onChange={(event) =>
              go({
                plan_type: (event.target.value || undefined) as
                  | OpsChurchPlanType
                  | undefined,
                page: 1,
              })
            }
          >
            <option value="">Todos</option>
            {OPS_CHURCH_PLAN_TYPES.map((plan) => (
              <option key={plan} value={plan}>
                {planTypeLabel(plan)}
              </option>
            ))}
          </OpsSelect>
          <OpsSelect
            label="Status da assinatura"
            value={query.subscription_status ?? ""}
            onChange={(event) =>
              go({
                subscription_status: (event.target.value || undefined) as
                  | OpsChurchSubscriptionStatus
                  | undefined,
                page: 1,
              })
            }
          >
            <option value="">Todos</option>
            {OPS_CHURCH_SUBSCRIPTION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {subscriptionStatusLabel(status)}
              </option>
            ))}
          </OpsSelect>
          <OpsSelect
            label="Situação comercial"
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
          >
            <option value="">Todas</option>
            <option value="true">Comercialmente ativas</option>
            <option value="false">Comercialmente inativas</option>
          </OpsSelect>
          <OpsSelect
            label="Ordenar"
            value={`${query.sort_by}:${query.sort_order}`}
            onChange={(event) => {
              const [sort_by, sort_order] = event.target.value.split(":") as [
                OpsChurchSortField,
                "asc" | "desc",
              ];
              go({ sort_by, sort_order, page: 1 });
            }}
          >
            <option value="created_at:desc">Mais recentes</option>
            <option value="created_at:asc">Mais antigas</option>
            <option value="name:asc">Nome A–Z</option>
            <option value="name:desc">Nome Z–A</option>
            <option value="cnpj:asc">CNPJ A–Z</option>
            <option value="cnpj:desc">CNPJ Z–A</option>
          </OpsSelect>
          <div className="flex items-end gap-2 lg:col-span-6">
            <OpsButton type="submit">Buscar</OpsButton>
            {filtered ? (
              <Link
                href="/churches"
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
            ? "Nenhuma Igreja encontrada para estes filtros."
            : "Nenhuma Igreja cadastrada ainda."}
        </OpsEmpty>
      ) : result ? (
        <>
          <OpsTable>
            <OpsTableHead>
              <tr>
                <OpsTh>Igreja</OpsTh>
                <OpsTh>CNPJ</OpsTh>
                <OpsTh>Plano</OpsTh>
                <OpsTh>Assinatura</OpsTh>
                <OpsTh>Situação</OpsTh>
                <OpsTh className="text-right">Membros ativos</OpsTh>
              </tr>
            </OpsTableHead>
            <tbody>
              {result.data.map((church) => {
                const href = churchDetailHref(church.id, query);
                return (
                  <tr
                    key={church.id}
                    className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    onClick={(event) =>
                      onChurchRowClick(event, href, router.push)
                    }
                  >
                    <OpsTd>
                      <Link
                        href={href}
                        className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {church.name}
                      </Link>
                    </OpsTd>
                    <OpsTd className="font-mono text-xs text-foreground">
                      {formatCnpj(church.cnpj)}
                    </OpsTd>
                    <OpsTd>{planTypeLabel(church.plan_type)}</OpsTd>
                    <OpsTd>
                      {subscriptionStatusLabel(church.subscription_status)}
                    </OpsTd>
                    <OpsTd>
                      <OpsBadge
                        tone={church.commercially_active ? "success" : "neutral"}
                      >
                        {commerciallyActiveLabel(church.commercially_active)}
                      </OpsBadge>
                    </OpsTd>
                    <OpsTd className="text-right tabular-nums">
                      {church.members_active_count}
                    </OpsTd>
                  </tr>
                );
              })}
            </tbody>
          </OpsTable>

          {pagination ? (
            <OpsPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              noun={{ one: "Igreja", other: "Igrejas" }}
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

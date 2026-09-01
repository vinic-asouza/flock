"use client";

import { FormEvent, useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
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
  OpsClearFiltersLink,
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
          className="flex flex-wrap items-end gap-3"
        >
          <OpsInput
            label="Busca"
            type="search"
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
            maxLength={80}
            placeholder="Nome ou CNPJ"
            className="min-w-[14rem] flex-1"
          />
          <OpsSelect
            label="Plano"
            className="w-full sm:w-44"
            value={query.plan_type ?? ""}
            onChange={(value) =>
              go({
                plan_type: (value || undefined) as OpsChurchPlanType | undefined,
                page: 1,
              })
            }
            options={[
              { value: "", label: "Todos" },
              ...OPS_CHURCH_PLAN_TYPES.map((plan) => ({
                value: plan,
                label: planTypeLabel(plan),
              })),
            ]}
          />
          <OpsSelect
            label="Status da assinatura"
            className="w-full sm:w-52"
            value={query.subscription_status ?? ""}
            onChange={(value) =>
              go({
                subscription_status: (value || undefined) as
                  | OpsChurchSubscriptionStatus
                  | undefined,
                page: 1,
              })
            }
            options={[
              { value: "", label: "Todos" },
              ...OPS_CHURCH_SUBSCRIPTION_STATUSES.map((status) => ({
                value: status,
                label: subscriptionStatusLabel(status),
              })),
            ]}
          />
          <OpsSelect
            label="Situação comercial"
            className="w-full sm:w-52"
            value={
              typeof query.commercially_active === "boolean"
                ? String(query.commercially_active)
                : ""
            }
            onChange={(value) => {
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
            options={[
              { value: "", label: "Todas" },
              { value: "true", label: "Comercialmente ativas" },
              { value: "false", label: "Comercialmente inativas" },
            ]}
          />
          <OpsSelect
            label="Ordenar"
            className="w-full sm:w-44"
            value={`${query.sort_by}:${query.sort_order}`}
            onChange={(value) => {
              const [sort_by, sort_order] = value.split(":") as [
                OpsChurchSortField,
                "asc" | "desc",
              ];
              go({ sort_by, sort_order, page: 1 });
            }}
            options={[
              { value: "created_at:desc", label: "Mais recentes" },
              { value: "created_at:asc", label: "Mais antigas" },
              { value: "name:asc", label: "Nome A–Z" },
              { value: "name:desc", label: "Nome Z–A" },
              { value: "cnpj:asc", label: "CNPJ A–Z" },
              { value: "cnpj:desc", label: "CNPJ Z–A" },
            ]}
          />
          <OpsButton type="submit" className="w-11 shrink-0 px-0" aria-label="Buscar">
            <Search className="h-4 w-4" aria-hidden />
          </OpsButton>
          {filtered ? <OpsClearFiltersLink href="/churches" /> : null}
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
                <OpsTh fit>CNPJ</OpsTh>
                <OpsTh fit>Plano</OpsTh>
                <OpsTh fit>Assinatura</OpsTh>
                <OpsTh fit>Situação</OpsTh>
                <OpsTh fit className="text-right">
                  Membros ativos
                </OpsTh>
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
                    <OpsTd className="max-w-[18rem]" title={church.name}>
                      <Link
                        href={href}
                        className="block truncate font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {church.name}
                      </Link>
                    </OpsTd>
                    <OpsTd fit className="font-mono text-xs text-foreground">
                      {formatCnpj(church.cnpj)}
                    </OpsTd>
                    <OpsTd fit>{planTypeLabel(church.plan_type)}</OpsTd>
                    <OpsTd fit>
                      {subscriptionStatusLabel(church.subscription_status)}
                    </OpsTd>
                    <OpsTd fit>
                      <OpsBadge
                        tone={church.commercially_active ? "success" : "neutral"}
                      >
                        {commerciallyActiveLabel(church.commercially_active)}
                      </OpsBadge>
                    </OpsTd>
                    <OpsTd fit className="text-right tabular-nums">
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

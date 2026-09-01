"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CreditCard,
  Fingerprint,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { opsApi } from "@/services/api";
import type { OpsChurchListItem, OpsChurchListResponse } from "@/types/opsChurches";
import { formatOpsReadError } from "@/lib/opsReadErrors";
import {
  commerciallyActiveLabel,
  planTypeLabel,
  subscriptionStatusLabel,
  subscriptionStatusTone,
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
import {
  displayValue,
  formatCityState,
  formatCnpj,
  formatDate,
  formatDateTime,
} from "@/lib/opsFormat";
import {
  OpsBadge,
  OpsButton,
  OpsButtonLink,
  OpsCardListSkeleton,
  OpsClearFiltersLink,
  OpsContactField,
  OpsDetailGrid,
  OpsDetailItem,
  OpsEmpty,
  OpsError,
  OpsFilterBar,
  OpsFilterRow,
  OpsInput,
  OpsListCard,
  OpsListCardAccordion,
  OpsListCardHeader,
  OpsMetaItem,
  OpsPage,
  OpsPageHeader,
  OpsPagination,
  OpsSelect,
} from "@/components/ui";

function hrefFrom(
  current: OpsChurchListQuery,
  patch: Partial<OpsChurchListQuery>
): string {
  return churchesListHref({ ...current, ...patch });
}

function ChurchCard({
  church,
  href,
}: {
  church: OpsChurchListItem;
  href: string;
}) {
  const address = [church.address, church.city, church.state]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" — ");

  return (
    <OpsListCard>
      <OpsListCardHeader>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-sm font-semibold">
              <Link
                href={href}
                className="text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {church.name}
              </Link>
            </h2>
            <OpsBadge tone={church.commercially_active ? "success" : "neutral"}>
              {commerciallyActiveLabel(church.commercially_active)}
            </OpsBadge>
            <OpsBadge tone="neutral">{planTypeLabel(church.plan_type)}</OpsBadge>
            <OpsBadge tone={subscriptionStatusTone(church.subscription_status)}>
              {subscriptionStatusLabel(church.subscription_status)}
            </OpsBadge>
          </div>
          <ul className="mt-1.5 flex flex-col gap-1 text-xs text-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
            <OpsMetaItem icon={MapPin}>
              {formatCityState(church.city, church.state)}
            </OpsMetaItem>
            <OpsMetaItem icon={Users}>
              {church.members_active_count}{" "}
              {church.members_active_count === 1 ? "membro ativo" : "membros ativos"}
            </OpsMetaItem>
            <OpsMetaItem icon={CalendarDays}>
              {formatDate(church.created_at)}
            </OpsMetaItem>
          </ul>
        </div>
        <OpsButtonLink href={href} size="sm" className="shrink-0">
          Abrir ficha
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </OpsButtonLink>
      </OpsListCardHeader>

      <OpsListCardAccordion>
        <OpsDetailGrid>
          <OpsDetailItem icon={Fingerprint} label="CNPJ">
            <span className="font-mono text-xs">{formatCnpj(church.cnpj)}</span>
          </OpsDetailItem>
          <OpsDetailItem icon={Building2} label="Denominação">
            {displayValue(church.denomination)}
          </OpsDetailItem>
          <OpsContactField
            kind="email"
            label="E-mail da Igreja"
            value={church.email_church}
          />
          <OpsContactField
            kind="phone"
            label="Telefone da Igreja"
            value={church.phone_church}
          />
          <OpsDetailItem icon={MapPin} label="Endereço" wide>
            {address || "—"}
          </OpsDetailItem>
          <OpsDetailItem icon={Users} label="Membros">
            {church.members_active_count} ativos · {church.members_inactive_count}{" "}
            inativos
          </OpsDetailItem>
          <OpsDetailItem icon={CreditCard} label="Vigência da assinatura">
            {church.subscription_start_date || church.subscription_end_date
              ? `${formatDate(church.subscription_start_date)} → ${formatDate(church.subscription_end_date)}`
              : "—"}
          </OpsDetailItem>
          <OpsDetailItem icon={CalendarDays} label="Cadastrada em" wide>
            {formatDateTime(church.created_at)}
          </OpsDetailItem>
        </OpsDetailGrid>
      </OpsListCardAccordion>
    </OpsListCard>
  );
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
        description="Busca e filtros sobre as Igrejas da plataforma. Abra a ficha para o histórico completo."
      />

      <OpsFilterBar>
        <form onSubmit={onSearch}>
          <OpsFilterRow>
            <OpsInput
              label="Busca"
              type="search"
              density="sm"
              value={qInput}
              onChange={(event) => setQInput(event.target.value)}
              maxLength={80}
              placeholder="Nome ou CNPJ"
              className="min-w-32 flex-[1.4] basis-0"
            />
            <OpsSelect
              label="Plano"
              density="sm"
              className="min-w-24 flex-1 basis-0"
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
              label="Assinatura"
              density="sm"
              className="min-w-28 flex-1 basis-0"
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
              label="Situação"
              density="sm"
              className="min-w-28 flex-1 basis-0"
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
              density="sm"
              className="min-w-28 flex-1 basis-0"
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
            <OpsButton
              type="submit"
              size="sm"
              className="h-9 w-9 shrink-0 px-0"
              aria-label="Buscar"
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
            </OpsButton>
            {filtered ? <OpsClearFiltersLink href="/churches" /> : null}
          </OpsFilterRow>
        </form>
      </OpsFilterBar>

      {isLoading ? (
        <OpsCardListSkeleton />
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
          <div className="flex flex-col gap-2">
            {result.data.map((church) => (
              <ChurchCard
                key={church.id}
                church={church}
                href={churchDetailHref(church.id, query)}
              />
            ))}
          </div>

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

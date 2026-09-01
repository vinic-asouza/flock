"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Check,
  Church,
  CreditCard,
  MapPin,
  MessageSquareText,
  Search,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { opsApi } from "@/services/api";
import type { OpsWaitlistListItem, OpsWaitlistListResponse } from "@/types/opsWaitlist";
import {
  formatOpsReadError,
  formatOpsWaitlistMutationError,
} from "@/lib/opsReadErrors";
import {
  waitlistPlanLabel,
  waitlistStatusLabel,
} from "@/lib/opsWaitlistLabels";
import {
  OPS_WAITLIST_PLANS,
  hasActiveWaitlistFilters,
  parseWaitlistListSearchParams,
  waitlistListHref,
  type OpsWaitlistListQuery,
  type OpsWaitlistPlan,
  type OpsWaitlistStatus,
  type OpsWaitlistStatusFilter,
} from "@/lib/opsWaitlistQuery";
import { formatCityState, formatDate, formatDateTime } from "@/lib/opsFormat";
import {
  OpsBadge,
  OpsButton,
  OpsCardListSkeleton,
  OpsClearFiltersLink,
  OpsConfirmDialog,
  OpsContactField,
  OpsDetailGrid,
  OpsDetailItem,
  OpsEmpty,
  OpsError,
  OpsFilterBar,
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
  current: OpsWaitlistListQuery,
  patch: Partial<OpsWaitlistListQuery>
): string {
  return waitlistListHref({ ...current, ...patch });
}

function statusBadgeTone(
  status: OpsWaitlistStatus
): "success" | "warning" | "neutral" {
  if (status === "converted") {
    return "success";
  }
  if (status === "discarded") {
    return "neutral";
  }
  return "warning";
}

function WaitlistLeadCard({
  lead,
  busy,
  onConvert,
  onDiscard,
}: {
  lead: OpsWaitlistListItem;
  busy: boolean;
  onConvert: () => void;
  onDiscard: () => void;
}) {
  const pending = lead.status === "pending";

  return (
    <OpsListCard>
      <OpsListCardHeader>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-sm font-semibold text-primary">{lead.name}</h2>
            <OpsBadge tone={statusBadgeTone(lead.status)}>
              {waitlistStatusLabel(lead.status)}
            </OpsBadge>
          </div>
          <ul className="mt-1.5 flex flex-col gap-1 text-xs text-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
            <OpsMetaItem icon={Church} title={lead.church_name}>
              {lead.church_name}
            </OpsMetaItem>
            <OpsMetaItem icon={MapPin}>
              {formatCityState(lead.city, lead.state)}
            </OpsMetaItem>
            <OpsMetaItem icon={CalendarDays}>
              {formatDate(lead.created_at)}
            </OpsMetaItem>
          </ul>
        </div>
        {pending ? (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <OpsButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              aria-label="Marcar como convertido"
              onClick={onConvert}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              Converter
            </OpsButton>
            <OpsButton
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={busy}
              aria-label="Excluir da lista"
              onClick={onDiscard}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Excluir
            </OpsButton>
          </div>
        ) : null}
      </OpsListCardHeader>

      <OpsListCardAccordion>
        <OpsDetailGrid>
          <OpsContactField kind="email" label="E-mail" value={lead.email} />
          <OpsContactField kind="phone" label="Telefone" value={lead.phone} />
          <OpsDetailItem icon={CreditCard} label="Plano de interesse">
            {waitlistPlanLabel(lead.plan)}
          </OpsDetailItem>
          <OpsDetailItem icon={CalendarDays} label="Cadastro">
            {formatDateTime(lead.created_at)}
          </OpsDetailItem>
          {lead.status !== "pending" && lead.status_updated_at ? (
            <OpsDetailItem icon={Check} label="Situação atualizada em" wide>
              {formatDateTime(lead.status_updated_at)}
            </OpsDetailItem>
          ) : null}
          <OpsDetailItem icon={MessageSquareText} label="Mensagem" wide>
            <span className="whitespace-pre-wrap">
              {lead.message?.trim() ? lead.message : "—"}
            </span>
          </OpsDetailItem>
        </OpsDetailGrid>
      </OpsListCardAccordion>
    </OpsListCard>
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
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    lead: OpsWaitlistListItem;
    nextStatus: "converted" | "discarded";
  } | null>(null);

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
  }, [searchKey, query, reloadKey]);

  const go = (patch: Partial<OpsWaitlistListQuery>) => {
    router.push(hrefFrom(query, patch));
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = qInput.trim().slice(0, 80);
    go({ q: q || undefined, page: 1 });
  };

  const applyStatus = async (
    lead: OpsWaitlistListItem,
    nextStatus: "converted" | "discarded"
  ) => {
    setBusyId(lead.id);
    try {
      await opsApi.patchWaitlist(lead.id, nextStatus);
      toast.success(
        nextStatus === "converted"
          ? `${lead.name} marcado como convertido.`
          : `${lead.name} excluído da lista.`
      );
      setConfirm(null);
      setReloadKey((value) => value + 1);
    } catch (err) {
      toast.error(formatOpsWaitlistMutationError(err));
      setReloadKey((value) => value + 1);
    } finally {
      setBusyId(null);
    }
  };

  const pagination = result?.pagination;
  const filtered = hasActiveWaitlistFilters(query);

  return (
    <OpsPage>
      <OpsPageHeader
        title="Lista de espera"
        description="Leads captados na landing. Marque como convertido ou exclua da lista — isso não cria uma Igreja nem apaga o e-mail do cadastro."
      />

      <OpsFilterBar>
        <form onSubmit={onSearch} className="flex flex-wrap items-end gap-3">
          <OpsInput
            label="Busca"
            type="search"
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
            maxLength={80}
            placeholder="Nome, e-mail ou igreja"
            className="min-w-[14rem] flex-1"
          />
          <OpsSelect
            label="Situação"
            className="w-full sm:w-44"
            value={query.status}
            onChange={(value) =>
              go({
                status: value as OpsWaitlistStatusFilter,
                page: 1,
              })
            }
            options={[
              { value: "pending", label: "Pendentes" },
              { value: "converted", label: "Convertidos" },
              { value: "discarded", label: "Excluídos" },
              { value: "all", label: "Todas" },
            ]}
          />
          <OpsSelect
            label="Plano de interesse"
            className="w-full sm:w-44"
            value={query.plan ?? ""}
            onChange={(value) =>
              go({
                plan: (value || undefined) as OpsWaitlistPlan | undefined,
                page: 1,
              })
            }
            options={[
              { value: "", label: "Todos" },
              ...OPS_WAITLIST_PLANS.map((plan) => ({
                value: plan,
                label: waitlistPlanLabel(plan),
              })),
            ]}
          />
          <OpsSelect
            label="Ordenar"
            className="w-full sm:w-44"
            value={`${query.sort_by}:${query.sort_order}`}
            onChange={(value) => {
              const [, sort_order] = value.split(":") as ["created_at", "asc" | "desc"];
              go({ sort_by: "created_at", sort_order, page: 1 });
            }}
            options={[
              { value: "created_at:desc", label: "Mais recentes" },
              { value: "created_at:asc", label: "Mais antigos" },
            ]}
          />
          <OpsButton type="submit" className="w-11 shrink-0 px-0" aria-label="Buscar">
            <Search className="h-4 w-4" aria-hidden />
          </OpsButton>
          {filtered ? <OpsClearFiltersLink href="/waitlist" /> : null}
        </form>
      </OpsFilterBar>

      {isLoading ? (
        <OpsCardListSkeleton />
      ) : error ? (
        <OpsError title={error.title} details={error.details} />
      ) : result && result.data.length === 0 ? (
        <OpsEmpty>
          {filtered
            ? "Nenhum lead encontrado para estes filtros."
            : "Nenhum lead pendente na Lista de espera."}
        </OpsEmpty>
      ) : result ? (
        <>
          <div className="flex flex-col gap-2">
            {result.data.map((lead) => (
              <WaitlistLeadCard
                key={lead.id}
                lead={lead}
                busy={busyId === lead.id}
                onConvert={() => setConfirm({ lead, nextStatus: "converted" })}
                onDiscard={() => setConfirm({ lead, nextStatus: "discarded" })}
              />
            ))}
          </div>

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

      <OpsConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.nextStatus === "converted"
            ? "Marcar como convertido?"
            : "Excluir da lista?"
        }
        body={
          confirm?.nextStatus === "converted" ? (
            <p>
              {confirm.lead.name} sai da fila de pendentes. Isso não cria uma Igreja
              nem inicia cobrança — só registra que o lead foi convertido.
            </p>
          ) : (
            <p>
              {confirm?.lead.name} deixa de aparecer como pendente. O e-mail continua
              cadastrado e não pode se inscrever de novo na landing.
            </p>
          )
        }
        confirmLabel={
          confirm?.nextStatus === "converted"
            ? "Marcar como convertido"
            : "Excluir da lista"
        }
        tone={confirm?.nextStatus === "discarded" ? "danger" : "primary"}
        busy={Boolean(busyId)}
        onClose={() => {
          if (!busyId) {
            setConfirm(null);
          }
        }}
        onConfirm={() => {
          if (confirm) {
            void applyStatus(confirm.lead, confirm.nextStatus);
          }
        }}
      />
    </OpsPage>
  );
}

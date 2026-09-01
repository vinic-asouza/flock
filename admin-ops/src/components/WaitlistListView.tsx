"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Church,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Search,
  Trash2,
} from "lucide-react";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
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
import { displayValue, formatDate, formatDateTime, formatPhone } from "@/lib/opsFormat";
import {
  OpsBadge,
  OpsButton,
  OpsCardListSkeleton,
  OpsClearFiltersLink,
  OpsConfirmDialog,
  OpsEmpty,
  OpsError,
  OpsFilterBar,
  OpsInput,
  OpsPage,
  OpsPageHeader,
  OpsPagination,
  OpsSelect,
} from "@/components/ui";
import { cn } from "@/lib/cn";

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

function locationLabel(lead: OpsWaitlistListItem): string {
  const city = displayValue(lead.city);
  if (!lead.state) {
    return city;
  }
  if (city === "—") {
    return lead.state;
  }
  return `${lead.city}/${lead.state}`;
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
    <article className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-primary">{lead.name}</h2>
            <OpsBadge tone={statusBadgeTone(lead.status)}>
              {waitlistStatusLabel(lead.status)}
            </OpsBadge>
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
            <li className="flex min-w-0 items-center gap-1.5">
              <Church className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate" title={lead.church_name}>
                {lead.church_name}
              </span>
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{locationLabel(lead)}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{formatDate(lead.created_at)}</span>
            </li>
          </ul>
        </div>
        {pending ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <OpsButton
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={onConvert}
            >
              <Check className="h-4 w-4" aria-hidden />
              Marcar como convertido
            </OpsButton>
            <OpsButton
              type="button"
              variant="ghost"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={busy}
              onClick={onDiscard}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Excluir da lista
            </OpsButton>
          </div>
        ) : null}
      </div>

      <Disclosure>
        {({ open }) => (
          <>
            <DisclosureButton className="flex w-full items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-2.5 text-left text-sm font-medium text-primary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
              {open ? "Menos informações" : "Mais informações"}
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted transition-transform",
                  open && "rotate-180"
                )}
                aria-hidden
              />
            </DisclosureButton>
            <DisclosurePanel className="border-t border-gray-100 px-5 py-4">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="flex gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      E-mail
                    </dt>
                    <dd className="mt-0.5 break-all text-sm text-foreground">
                      {lead.email}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Telefone
                    </dt>
                    <dd className="mt-0.5 text-sm text-foreground">
                      {formatPhone(lead.phone)}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Church className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Plano de interesse
                    </dt>
                    <dd className="mt-0.5 text-sm text-foreground">
                      {waitlistPlanLabel(lead.plan)}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Cadastro
                    </dt>
                    <dd className="mt-0.5 text-sm text-foreground">
                      {formatDateTime(lead.created_at)}
                    </dd>
                  </div>
                </div>
                {lead.status !== "pending" && lead.status_updated_at ? (
                  <div className="flex gap-2 sm:col-span-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                        Situação atualizada em
                      </dt>
                      <dd className="mt-0.5 text-sm text-foreground">
                        {formatDateTime(lead.status_updated_at)}
                      </dd>
                    </div>
                  </div>
                ) : null}
                <div className="flex gap-2 sm:col-span-2">
                  <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Mensagem
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">
                      {lead.message?.trim() ? lead.message : "—"}
                    </dd>
                  </div>
                </div>
              </dl>
            </DisclosurePanel>
          </>
        )}
      </Disclosure>
    </article>
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
          <div className="flex flex-col gap-3">
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

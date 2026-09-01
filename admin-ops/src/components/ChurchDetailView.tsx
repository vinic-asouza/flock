"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { opsApi } from "@/services/api";
import type { OpsChurchDetail } from "@/types/opsChurches";
import {
  formatOpsReadError,
  isNotFoundReadError,
} from "@/lib/opsReadErrors";
import {
  commerciallyActiveLabel,
  planTypeLabel,
  subscriptionStatusLabel,
} from "@/lib/opsChurchLabels";
import {
  churchesListHref,
  parseChurchListSearchParams,
} from "@/lib/opsChurchQuery";
import { displayValue, formatCnpj, formatDate, formatDateTime } from "@/lib/opsFormat";
import {
  OpsBadge,
  OpsDetailSkeleton,
  OpsEmpty,
  OpsError,
  OpsPage,
  OpsPageHeader,
  OpsPanel,
} from "@/components/ui";

function DefinitionItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function BackToChurchesLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-primary hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      Voltar para Igrejas
    </Link>
  );
}

export function ChurchDetailView() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const churchId = Array.isArray(params.id) ? params.id[0] : params.id;
  const searchKey = searchParams.toString();
  const listHref = useMemo(
    () =>
      churchesListHref(
        parseChurchListSearchParams(new URLSearchParams(searchKey))
      ),
    [searchKey]
  );

  const [church, setChurch] = useState<OpsChurchDetail | null>(null);
  const [error, setError] = useState<{ title: string; details?: string } | null>(
    null
  );
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!churchId) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setNotFound(false);
        const data = await opsApi.getChurch(churchId);
        if (!cancelled) {
          setChurch(data);
        }
      } catch (err) {
        if (!cancelled) {
          setChurch(null);
          if (isNotFoundReadError(err)) {
            setNotFound(true);
            setError(formatOpsReadError(err));
          } else {
            setNotFound(false);
            setError(formatOpsReadError(err));
          }
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
  }, [churchId]);

  if (isLoading) {
    return (
      <OpsPage>
        <OpsPageHeader title="Ficha da Igreja" />
        <OpsDetailSkeleton />
      </OpsPage>
    );
  }

  if (notFound) {
    return (
      <OpsPage>
        <OpsPageHeader
          title="Igreja não encontrada"
          actions={<BackToChurchesLink href={listHref} />}
        />
        <OpsError
          title={error?.title || "Igreja não encontrada"}
          details={error?.details}
        />
      </OpsPage>
    );
  }

  if (error || !church) {
    return (
      <OpsPage>
        <OpsPageHeader title="Ficha da Igreja" />
        <OpsError
          title={error?.title || "Não foi possível carregar a ficha."}
          details={error?.details}
        />
      </OpsPage>
    );
  }

  const address = [church.address, church.city, church.state]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" — ");

  return (
    <OpsPage>
      <OpsPageHeader
        eyebrow={
          <p className="mb-1 text-sm text-muted">
            <Link
              href={listHref}
              className="text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Igrejas
            </Link>
            <span aria-hidden> / </span>
            <span>{church.name}</span>
          </p>
        }
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {church.name}
            <OpsBadge tone={church.commercially_active ? "success" : "neutral"}>
              {commerciallyActiveLabel(church.commercially_active)}
            </OpsBadge>
          </span>
        }
        description="Ficha somente leitura para suporte. Sem rol de Membros e sem ações de mutação."
        actions={<BackToChurchesLink href={listHref} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <OpsPanel title="Cadastro e contato">
          <dl className="grid gap-4 sm:grid-cols-2">
            <DefinitionItem label="Nome" value={church.name} />
            <DefinitionItem
              label="Denominação"
              value={displayValue(church.denomination)}
            />
            <DefinitionItem label="CNPJ" value={formatCnpj(church.cnpj)} />
            <DefinitionItem
              label="Cadastrada em"
              value={formatDateTime(church.created_at)}
            />
            <DefinitionItem
              label="E-mail da Igreja"
              value={displayValue(church.email_church)}
            />
            <DefinitionItem
              label="Telefone da Igreja"
              value={displayValue(church.phone_church)}
            />
            <div className="sm:col-span-2">
              <DefinitionItem
                label="Endereço"
                value={displayValue(address)}
              />
            </div>
          </dl>
        </OpsPanel>

        <OpsPanel title="Plano e assinatura">
          <dl className="grid gap-4 sm:grid-cols-2">
            <DefinitionItem
              label="Plano"
              value={planTypeLabel(church.plan_type)}
            />
            <DefinitionItem
              label="Status da assinatura"
              value={subscriptionStatusLabel(church.subscription_status)}
            />
            <div className="sm:col-span-2">
              <DefinitionItem
                label="Situação comercial"
                value={
                  <OpsBadge
                    tone={church.commercially_active ? "success" : "neutral"}
                  >
                    {commerciallyActiveLabel(church.commercially_active)}
                  </OpsBadge>
                }
              />
            </div>
            <DefinitionItem
              label="Início"
              value={formatDate(church.subscription_start_date)}
            />
            <DefinitionItem
              label="Término"
              value={formatDate(church.subscription_end_date)}
            />
            <DefinitionItem
              label="Atualizado em"
              value={formatDateTime(church.subscription_updated_at)}
            />
            <DefinitionItem
              label="Customer Stripe"
              value={
                <span className="font-mono text-xs">
                  {displayValue(church.stripe_customer_id)}
                </span>
              }
            />
            <DefinitionItem
              label="Subscription Stripe"
              value={
                <span className="font-mono text-xs">
                  {displayValue(church.stripe_subscription_id)}
                </span>
              }
            />
          </dl>
        </OpsPanel>
      </div>

      <OpsPanel title="Contagens">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DefinitionItem
            label="Membros ativos"
            value={church.members_active_count}
          />
          <DefinitionItem
            label="Membros inativos"
            value={church.members_inactive_count}
          />
          <DefinitionItem
            label="Usuários da igreja"
            value={church.church_users.total}
          />
          <DefinitionItem
            label="Usuários por status"
            value={`${church.church_users.active} ativos · ${church.church_users.invited} convidados · ${church.church_users.disabled} desativados`}
          />
        </dl>
        <p className="mt-4 text-xs text-muted">
          Contagens apenas. O rol de Membros não é exibido neste console.{" "}
          {commerciallyActiveLabel(church.commercially_active)} não se refere a
          Membro ativo.
        </p>
      </OpsPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <OpsPanel title="Eventos de assinatura">
          {church.subscription_events.length === 0 ? (
            <OpsEmpty>Nenhum evento de assinatura recente.</OpsEmpty>
          ) : (
            <ul className="divide-y divide-gray-100">
              {church.subscription_events.map((event) => (
                <li key={event.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-foreground">
                    {event.event_type}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {planTypeLabel(event.old_plan)} → {planTypeLabel(event.new_plan)}
                    {" · "}
                    {subscriptionStatusLabel(event.old_status)} →{" "}
                    {subscriptionStatusLabel(event.new_status)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {event.source} · {formatDateTime(event.created_at)}
                    {event.stripe_event_id
                      ? ` · ${event.stripe_event_id}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </OpsPanel>

        <OpsPanel title="Histórico de atividades">
          {church.audit_logs.length === 0 ? (
            <OpsEmpty>Nenhum item recente no histórico.</OpsEmpty>
          ) : (
            <ul className="divide-y divide-gray-100">
              {church.audit_logs.map((log) => (
                <li key={log.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-foreground">
                    {log.action} · {log.entity}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {log.actor.displayName}
                    {log.actor.email && log.actor.email !== log.actor.displayName
                      ? ` · ${log.actor.email}`
                      : ""}
                    {" · "}
                    {formatDateTime(log.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </OpsPanel>
      </div>
    </OpsPage>
  );
}

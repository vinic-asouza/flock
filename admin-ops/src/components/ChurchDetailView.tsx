"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { displayValue, formatCnpj, formatDate, formatDateTime } from "@/lib/opsFormat";
import { PageFrame, Panel } from "@/components/PageFrame";
import { CommercialBadge } from "@/components/CommercialBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ConsoleState";

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

export function ChurchDetailView() {
  const params = useParams<{ id: string }>();
  const churchId = Array.isArray(params.id) ? params.id[0] : params.id;

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
      <PageFrame title="Ficha da Igreja">
        <LoadingState label="Carregando ficha…" />
      </PageFrame>
    );
  }

  if (notFound) {
    return (
      <PageFrame
        title="Igreja não encontrada"
        actions={
          <Link
            href="/churches"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-primary"
          >
            Voltar à lista
          </Link>
        }
      >
        <ErrorState
          title={error?.title || "Igreja não encontrada"}
          details={error?.details}
        />
      </PageFrame>
    );
  }

  if (error || !church) {
    return (
      <PageFrame title="Ficha da Igreja">
        <ErrorState
          title={error?.title || "Não foi possível carregar a ficha."}
          details={error?.details}
        />
      </PageFrame>
    );
  }

  const address = [church.address, church.city, church.state]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" — ");

  return (
    <PageFrame
      title={church.name}
      description="Ficha somente leitura para suporte. Sem rol de Membros e sem ações de mutação."
      actions={
        <Link
          href="/churches"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-primary"
        >
          Voltar à lista
        </Link>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Cadastro e contato">
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
        </Panel>

        <Panel title="Plano e assinatura">
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
                value={<CommercialBadge active={church.commercially_active} />}
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
        </Panel>
      </div>

      <Panel title="Contagens">
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
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Eventos de assinatura">
          {church.subscription_events.length === 0 ? (
            <EmptyState>Nenhum evento de assinatura recente.</EmptyState>
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
        </Panel>

        <Panel title="Histórico de atividades">
          {church.audit_logs.length === 0 ? (
            <EmptyState>Nenhum item recente no histórico.</EmptyState>
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
        </Panel>
      </div>
    </PageFrame>
  );
}

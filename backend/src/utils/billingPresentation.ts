/**
 * Chave estável de um cancelamento agendado.
 * Webhooks repetidos do mesmo `cancel_at` não geram outro evento.
 */
export function scheduledCancellationStripeEventId(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean | null | undefined,
  cancelAt: number | null | undefined
): string | null {
  if (!cancelAtPeriodEnd || cancelAt == null || !subscriptionId) {
    return null;
  }
  return `${subscriptionId}:${cancelAt}`;
}

export type ScheduledCancellationSnapshot = {
  subscriptionId: string | null | undefined;
  status?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  cancelAt?: number | null;
  /**
   * Instante do pedido no Stripe. Muda a cada cancelamento,
   * mesmo quando o fim do período (`cancel_at`) continua o mesmo.
   */
  canceledAt?: number | null;
  /** `current_period_end` do item. A assinatura na API clover não traz mais esse campo. */
  itemPeriodEnd?: number | null;
};

/**
 * Cancelamento ainda não efetivado.
 * `cancel_at` basta; a flag pode vir falsa quando o portal grava só a data.
 * `canceled_at` não entra aqui — não é a data em que o acesso acaba.
 */
export function resolveScheduledCancellation(
  snapshot: ScheduledCancellationSnapshot
): { eventId: string; cancelAt: number } | null {
  const subscriptionId = snapshot.subscriptionId?.trim();
  if (!subscriptionId) return null;
  if (snapshot.status === 'canceled' || snapshot.status === 'incomplete_expired') {
    return null;
  }

  const explicitCancelAt = typeof snapshot.cancelAt === 'number' ? snapshot.cancelAt : null;
  const cancelAt =
    explicitCancelAt ??
    (snapshot.cancelAtPeriodEnd === true && typeof snapshot.itemPeriodEnd === 'number'
      ? snapshot.itemPeriodEnd
      : null);

  if (cancelAt == null) return null;

  const canceledAt = typeof snapshot.canceledAt === 'number' ? snapshot.canceledAt : null;
  const eventId =
    canceledAt != null
      ? `${subscriptionId}:${cancelAt}:${canceledAt}`
      : `${subscriptionId}:${cancelAt}`;

  return { eventId, cancelAt };
}

/** Chave gravada antes de `canceled_at` entrar no identificador. */
export function legacyScheduledCancellationEventId(
  subscriptionId: string,
  cancelAt: number
): string {
  return `${subscriptionId}:${cancelAt}`;
}

/**
 * Instante em que a fatura foi paga. O histórico usa essa hora,
 * não o momento em que o sync gravou a linha.
 */
export function invoicePaidAtIso(
  invoice:
    | { status_transitions?: { paid_at?: number | null } | null }
    | string
    | null
    | undefined
): string | null {
  if (!invoice || typeof invoice === 'string') return null;
  const paidAt = invoice.status_transitions?.paid_at;
  if (typeof paidAt !== 'number' || !Number.isFinite(paidAt) || paidAt <= 0) return null;
  return new Date(paidAt * 1000).toISOString();
}

/** O sync gravou a linha bem depois do pagamento. Um minuto cobre o relógio do webhook. */
export function paymentRecoveryRecordedLate(
  recordedAt: string | null | undefined,
  occurredAt: string | null | undefined,
  skewMs = 60_000
): boolean {
  if (!recordedAt || !occurredAt) return false;
  const recorded = new Date(recordedAt).getTime();
  const occurred = new Date(occurredAt).getTime();
  if (Number.isNaN(recorded) || Number.isNaN(occurred)) return false;
  return recorded - occurred > skewMs;
}

/** Uma confirmação de pagamento por fatura que tirou a assinatura de past_due. */
export function paymentRecoveryEventId(
  subscriptionId: string | null | undefined,
  invoiceId: string | null | undefined
): string | null {
  const id = subscriptionId?.trim();
  const invoice = invoiceId?.trim();
  if (!id || !invoice) return null;
  return `${id}:recovered:${invoice}`;
}

/** Chave da renovação ligada ao cancelamento que ela desfez. */
export function subscriptionRenewalEventId(
  subscriptionId: string | null | undefined,
  cancellationKey: string | null | undefined
): string | null {
  const id = subscriptionId?.trim();
  const key = cancellationKey?.trim();
  if (!id || !key) return null;
  return `${id}:renewed:${key}`;
}

/** Uma troca de plano por fatura. Sem fatura, a chave ainda separa origem e destino. */
export function planChangeDedupeKey(
  subscriptionId: string | null | undefined,
  oldPlan: string | null | undefined,
  newPlan: string | null | undefined,
  invoiceId: string | null | undefined
): string | null {
  const id = subscriptionId?.trim();
  const from = oldPlan?.trim();
  const to = newPlan?.trim();
  if (!id || !from || !to || from === to) return null;
  return `${id}:plan:${from}:${to}:${invoiceId?.trim() || 'none'}`;
}

/**
 * URL da fatura hospedada quando ainda há valor em aberto.
 * Sem URL, o app não oferece o botão de confirmar pagamento.
 */
export function openInvoiceConfirmationUrl(latestInvoice: unknown): string | null {
  if (!latestInvoice || typeof latestInvoice !== 'object') {
    return null;
  }

  const invoice = latestInvoice as {
    status?: string | null;
    hosted_invoice_url?: string | null;
    amount_remaining?: number | null;
  };

  if (invoice.status !== 'open' || !invoice.hosted_invoice_url) {
    return null;
  }

  if (typeof invoice.amount_remaining === 'number' && invoice.amount_remaining <= 0) {
    return null;
  }

  return invoice.hosted_invoice_url;
}

export function contactPhoneFromAuthUser(user: {
  phone?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null | undefined): string | null {
  if (!user) return null;

  const metadataPhone = user.user_metadata?.phone;
  if (typeof metadataPhone === 'string' && metadataPhone.trim()) {
    return metadataPhone.trim();
  }

  if (typeof user.phone === 'string' && user.phone.trim()) {
    return user.phone.trim();
  }

  return null;
}

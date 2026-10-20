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

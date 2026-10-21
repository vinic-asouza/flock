export interface SubscriptionHistoryEvent {
  event_type: string;
  old_plan: string | null;
  new_plan: string | null;
  old_status: string | null;
  new_status: string | null;
  payload?: { cancel_at?: number | null } | null;
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function planLabel(oldPlan: string | null, newPlan: string | null): string {
  if (oldPlan && newPlan && oldPlan !== newPlan) return `Plano ${oldPlan} → ${newPlan}`;
  if (newPlan) return `Plano ${newPlan}`;
  if (oldPlan) return `Plano ${oldPlan}`;
  return '';
}

/**
 * Subtítulo do histórico de assinatura.
 * Transição de status só entra quando os lados diferem.
 * Cancelamento agendado acrescenta a data de fim de acesso (`payload.cancel_at`, unix segundos).
 */
export function subscriptionHistoryDetail(
  evt: SubscriptionHistoryEvent,
  formatAccessDate: (iso: string) => string,
): string {
  const parts: string[] = [];
  const plan = planLabel(evt.old_plan, evt.new_plan);
  if (plan) parts.push(plan);

  if (evt.event_type === 'cancellation_scheduled') {
    const cancelAt = evt.payload?.cancel_at;
    if (typeof cancelAt === 'number' && Number.isFinite(cancelAt) && cancelAt > 0) {
      const formatted = formatAccessDate(new Date(cancelAt * 1000).toISOString());
      if (formatted && formatted !== 'N/A') {
        parts.push(`acesso até ${formatted}`);
      }
    }
  }

  const statusChanged = Boolean(evt.old_status || evt.new_status) && evt.old_status !== evt.new_status;
  if (evt.event_type !== 'activate_free' && statusChanged) {
    parts.push(`${evt.old_status ?? '—'} → ${evt.new_status ?? '—'}`);
  }

  return parts.join(' · ') || '—';
}

/**
 * Cartão da igreja: cidade e UF uma vez.
 * Se o texto livre já cita os dois, não acrescenta o sufixo. Não altera o valor salvo.
 */
export function formatChurchAddressLine(address: string, city: string, state: string): string {
  const street = address.trim();
  const cityName = city.trim();
  const uf = state.trim().toUpperCase();
  if (!street && !cityName && !uf) return '';

  const streetFolded = stripAccents(street);
  const hasCity = Boolean(cityName) && streetFolded.toLowerCase().includes(stripAccents(cityName).toLowerCase());
  const hasUf = Boolean(uf) && new RegExp(`(^|[^A-Za-z])${uf}([^A-Za-z]|$)`, 'i').test(streetFolded);

  if (street && hasCity && hasUf) return street;

  const suffix = [cityName, uf].filter(Boolean).join(' - ');
  if (!street) return suffix;
  if (!suffix) return street;
  return `${street}, ${suffix}`;
}

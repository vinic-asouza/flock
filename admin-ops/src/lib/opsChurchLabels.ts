const NONE_BREAKDOWN_KEY = "none";

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: "Assinatura ativa",
  trialing: "Em trial",
  past_due: "Inadimplente",
  canceled: "Cancelada",
  unpaid: "Não paga",
  incomplete: "Incompleta",
  incomplete_expired: "Incompleta expirada",
  paused: "Pausada",
};

const PLAN_ORDER = ["100", "200", "500", "800", "custom"];
const STATUS_ORDER = [
  "active",
  "canceled",
  "past_due",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "trialing",
  "paused",
];

export function planTypeLabel(value: string | null | undefined): string {
  if (!value || value === NONE_BREAKDOWN_KEY) {
    return "Sem plano";
  }
  if (value === "custom") {
    return "Personalizado";
  }
  if (["100", "200", "500", "800"].includes(value)) {
    return `Plano ${value}`;
  }
  return value;
}

export function subscriptionStatusLabel(
  value: string | null | undefined
): string {
  if (!value || value === NONE_BREAKDOWN_KEY) {
    return "Sem assinatura";
  }
  return SUBSCRIPTION_STATUS_LABELS[value] ?? value;
}

export function commerciallyActiveLabel(active: boolean): string {
  return active ? "Comercialmente ativa" : "Comercialmente inativa";
}

export function sortBreakdownEntries(
  entries: [string, number][],
  kind: "plan" | "status"
): [string, number][] {
  const order = kind === "plan" ? PLAN_ORDER : STATUS_ORDER;

  return [...entries].sort((left, right) => {
    if (left[0] === NONE_BREAKDOWN_KEY) {
      return 1;
    }
    if (right[0] === NONE_BREAKDOWN_KEY) {
      return -1;
    }
    const leftIndex = order.indexOf(left[0]);
    const rightIndex = order.indexOf(right[0]);
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
  });
}

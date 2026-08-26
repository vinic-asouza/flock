/** BR-OPS-004: commercially active church ⇔ Stripe subscription_status ∈ {active, trialing}. */

export const COMMERCIALLY_ACTIVE_STATUSES = ['active', 'trialing'] as const;

export type CommerciallyActiveStatus = (typeof COMMERCIALLY_ACTIVE_STATUSES)[number];

export function isCommerciallyActive(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

export function matchesCommerciallyActiveFilter(
  status: string | null | undefined,
  commerciallyActive: boolean
): boolean {
  const active = isCommerciallyActive(status);
  return commerciallyActive ? active : !active;
}

export const NONE_BREAKDOWN_KEY = 'none';

export function breakdownKey(value: string | null | undefined): string {
  return value ?? NONE_BREAKDOWN_KEY;
}

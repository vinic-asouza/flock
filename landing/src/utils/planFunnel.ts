export const SELECTED_PLAN_STORAGE_KEY = 'flock_selected_plan';

export type PaidPlanId = '200' | '500' | '800';

export function isPaidPlanId(value: string | null | undefined): value is PaidPlanId {
  return value === '200' || value === '500' || value === '800';
}

export function persistSelectedPlan(plan: string): void {
  if (typeof window === 'undefined' || !isPaidPlanId(plan)) return;
  try {
    sessionStorage.setItem(SELECTED_PLAN_STORAGE_KEY, plan);
  } catch {
    // ignore
  }
}

export function getPersistedPlan(): PaidPlanId | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = sessionStorage.getItem(SELECTED_PLAN_STORAGE_KEY);
    return isPaidPlanId(value) ? value : null;
  } catch {
    return null;
  }
}

export function buildRegisterUrl(plan: PaidPlanId, frontendUrl: string): string {
  persistSelectedPlan(plan);
  return `${frontendUrl}/register?plan=${plan}`;
}

export function buildFreeRegisterUrl(frontendUrl: string): string {
  return `${frontendUrl}/register?plan=100`;
}

export function buildLoginCheckoutUrl(plan: PaidPlanId, frontendUrl: string): string {
  return `${frontendUrl}/login?redirect=${encodeURIComponent(`/checkout?plan=${plan}`)}`;
}

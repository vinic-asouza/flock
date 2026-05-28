export const SELECTED_PLAN_STORAGE_KEY = 'flock_selected_plan';

export type PaidPlanId = '200' | '500' | '800';

export function isPaidPlanId(value: string | null | undefined): value is PaidPlanId {
  return value === '200' || value === '500' || value === '800';
}

export function isFreePlanId(value: string | null | undefined): boolean {
  return value === '100';
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

export function clearPersistedPlan(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SELECTED_PLAN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function resolveCheckoutPath(planFromQuery: string | null): string {
  if (isFreePlanId(planFromQuery)) {
    clearPersistedPlan();
    return '/checkout?plan=100';
  }

  if (isPaidPlanId(planFromQuery)) {
    return `/checkout?plan=${planFromQuery}`;
  }

  const persisted = getPersistedPlan();
  return persisted ? `/checkout?plan=${persisted}` : '/checkout';
}

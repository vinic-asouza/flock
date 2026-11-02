import type { WaitlistPlanId } from '@/utils/waitlistPlan';

export const WAITLIST_PLAN_EVENT = 'flock:waitlist-plan';

export function scrollToLandingSection(id: string): void {
  if (typeof document === 'undefined') return;
  const target = document.getElementById(id);
  if (!target) return;
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

export function selectWaitlistPlan(plan: WaitlistPlanId): void {
  if (typeof window === 'undefined') return;
  const nextHash = `#waitlist?plan=${plan}`;
  if (window.location.hash === nextHash) {
    window.dispatchEvent(new CustomEvent(WAITLIST_PLAN_EVENT, { detail: plan }));
  } else {
    window.location.hash = nextHash;
  }
  scrollToLandingSection('waitlist');
}

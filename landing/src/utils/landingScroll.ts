import type { WaitlistPlanId } from '@/utils/waitlistPlan';

export const WAITLIST_PLAN_EVENT = 'flock:waitlist-plan';
export const WAITLIST_DEMO_EVENT = 'flock:waitlist-demo';

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function scrollToLandingSection(id: string): void {
  if (typeof document === 'undefined') return;
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
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

/** Leva ao formulário de contato já com a intenção de agendar demonstração. */
export function requestDemo(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WAITLIST_DEMO_EVENT));
  scrollToLandingSection('waitlist');
}

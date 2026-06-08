import { ALL_TUTORIAL_GUIDES } from './guides';
import type { TutorialGuide, TutorialModuleId } from './types';

export const TUTORIAL_REGISTRY: TutorialGuide[] = ALL_TUTORIAL_GUIDES;

export function getGuideBySlug(slug: string): TutorialGuide | undefined {
  return TUTORIAL_REGISTRY.find((g) => g.slug === slug);
}

export function getTrailGuides(): TutorialGuide[] {
  return TUTORIAL_REGISTRY.filter((g) => g.trailOrder != null).sort(
    (a, b) => (a.trailOrder ?? 0) - (b.trailOrder ?? 0)
  );
}

export function getGuidesByModule(moduleId: TutorialModuleId): TutorialGuide[] {
  return TUTORIAL_REGISTRY.filter(
    (g) => g.module === moduleId && g.trailOrder == null
  );
}

export function getAllGuidesForModule(moduleId: TutorialModuleId): TutorialGuide[] {
  return TUTORIAL_REGISTRY.filter((g) => g.module === moduleId);
}

export function getAdjacentTrailGuide(
  current: TutorialGuide,
  direction: 'prev' | 'next'
): TutorialGuide | undefined {
  if (current.trailOrder == null) return undefined;
  const trail = getTrailGuides();
  const idx = trail.findIndex((g) => g.slug === current.slug);
  if (idx === -1) return undefined;
  if (direction === 'prev') return idx > 0 ? trail[idx - 1] : undefined;
  return idx < trail.length - 1 ? trail[idx + 1] : undefined;
}

export function getRelatedGuides(guide: TutorialGuide): TutorialGuide[] {
  return guide.related
    .map((slug) => getGuideBySlug(slug))
    .filter((g): g is TutorialGuide => g != null);
}

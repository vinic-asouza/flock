import { TUTORIAL_REGISTRY } from './registry';
import type { TutorialGuide, TutorialModuleId } from './types';

function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function guideSearchText(guide: TutorialGuide): string {
  const parts = [
    guide.title,
    guide.slug,
    ...guide.tags,
    ...guide.steps,
    ...(guide.details ?? []),
  ];
  return normalizeTerm(parts.join(' '));
}

export function searchGuides(query: string): TutorialGuide[] {
  const normalized = normalizeTerm(query);
  if (!normalized) return TUTORIAL_REGISTRY;

  return TUTORIAL_REGISTRY.filter((guide) =>
    guideSearchText(guide).includes(normalized)
  );
}

export function groupGuidesByModule(
  guides: TutorialGuide[]
): Partial<Record<TutorialModuleId, TutorialGuide[]>> {
  const grouped: Partial<Record<TutorialModuleId, TutorialGuide[]>> = {};
  for (const guide of guides) {
    if (guide.trailOrder != null) continue;
    if (!grouped[guide.module]) grouped[guide.module] = [];
    grouped[guide.module]!.push(guide);
  }
  return grouped;
}

export function filterHubGuides(
  query: string,
  moduleFilter?: TutorialModuleId | null
): TutorialGuide[] {
  let results = searchGuides(query);
  if (moduleFilter) {
    results = results.filter((g) => g.module === moduleFilter);
  }
  return results;
}

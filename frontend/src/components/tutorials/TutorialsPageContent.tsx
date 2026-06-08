'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getGuideBySlug } from '@/lib/tutorials/registry';
import type { TutorialModuleId } from '@/lib/tutorials/types';
import { TutorialGuideNotFound, TutorialGuideView } from './TutorialGuideView';
import { TutorialHub } from './TutorialHub';

const VALID_MODULES: TutorialModuleId[] = [
  'relatorios',
  'membros',
  'integracao',
  'congregacoes',
  'grupos',
  'calendario',
];

function parseModuleFilter(value: string | null): TutorialModuleId | null {
  if (!value) return null;
  return VALID_MODULES.includes(value as TutorialModuleId)
    ? (value as TutorialModuleId)
    : null;
}

export function TutorialsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guideSlug = searchParams.get('guia');
  const moduleFilter = parseModuleFilter(searchParams.get('modulo'));

  const navigateToHub = useCallback(() => {
    router.push('/tutorials');
  }, [router]);

  const openGuide = useCallback(
    (slug: string) => {
      router.push(`/tutorials?guia=${encodeURIComponent(slug)}`);
    },
    [router]
  );

  if (guideSlug) {
    const guide = getGuideBySlug(guideSlug);
    if (!guide) {
      return (
        <TutorialGuideNotFound slug={guideSlug} onBack={navigateToHub} />
      );
    }
    return (
      <TutorialGuideView
        guide={guide}
        onOpenGuide={openGuide}
        onBack={navigateToHub}
      />
    );
  }

  return (
    <TutorialHub
      moduleFilter={moduleFilter}
      onOpenGuide={openGuide}
    />
  );
}

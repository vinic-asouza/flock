'use client';

import { Button } from '@/components/ui/Button';
import { getGuideBySlug } from '@/lib/tutorials/registry';
import type { TutorialGuide } from '@/lib/tutorials/types';

interface RelatedGuidesProps {
  guide: TutorialGuide;
  onOpenGuide: (slug: string) => void;
}

export function RelatedGuides({ guide, onOpenGuide }: RelatedGuidesProps) {
  const related = guide.related
    .map((slug) => getGuideBySlug(slug))
    .filter((g): g is TutorialGuide => g != null);

  if (related.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900">Guias relacionados</h3>
      <div className="flex flex-wrap gap-2">
        {related.map((relatedGuide) => (
          <Button
            key={relatedGuide.slug}
            variant="secondary"
            size="sm"
            onClick={() => onOpenGuide(relatedGuide.slug)}
          >
            {relatedGuide.title}
          </Button>
        ))}
      </div>
    </div>
  );
}

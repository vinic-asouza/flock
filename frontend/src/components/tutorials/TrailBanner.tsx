'use client';

import { Rocket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getTrailGuides } from '@/lib/tutorials/registry';

interface TrailBannerProps {
  onStartTrail: (slug: string) => void;
}

export function TrailBanner({ onStartTrail }: TrailBannerProps) {
  const trail = getTrailGuides();
  const firstGuide = trail[0];

  return (
    <div className="bg-primary/5 border border-primary/30 rounded-lg p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Rocket size={20} className="text-primary shrink-0" />
            <h2 className="text-lg font-semibold text-gray-900">
              Primeiros passos no Flock
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            Configure sua igreja em 6 passos simples
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {trail.map((guide, index) => (
              <button
                key={guide.slug}
                type="button"
                onClick={() => onStartTrail(guide.slug)}
                className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary transition-colors"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white border border-gray-200 text-[10px] font-medium">
                  {index + 1}
                </span>
                <span className="hidden sm:inline truncate max-w-[120px]">
                  {guide.title.replace(/^Cadastrar sua primeira? /i, '').replace(/^Conhecer o /i, '')}
                </span>
              </button>
            ))}
          </div>
        </div>
        {firstGuide && (
          <Button
            onClick={() => onStartTrail(firstGuide.slug)}
            className="shrink-0 w-full sm:w-auto"
          >
            Começar trilha →
          </Button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { TUTORIAL_MODULES } from '@/lib/tutorials/modules';
import { searchGuides } from '@/lib/tutorials/searchGuides';
import type { TutorialModuleId } from '@/lib/tutorials/types';
import { getGuidesByModule } from '@/lib/tutorials/registry';
import { ModuleCard } from './ModuleCard';
import { TrailBanner } from './TrailBanner';
import { TutorialSearch } from './TutorialSearch';

interface TutorialHubProps {
  moduleFilter?: TutorialModuleId | null;
  onOpenGuide: (slug: string) => void;
}

export function TutorialHub({ moduleFilter, onOpenGuide }: TutorialHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<TutorialModuleId>>(
    new Set()
  );

  const filteredGuides = useMemo(() => {
    const results = searchGuides(searchQuery);
    if (!moduleFilter) return results;
    return results.filter((g) => g.module === moduleFilter);
  }, [searchQuery, moduleFilter]);

  const hasActiveSearch = searchQuery.trim().length > 0;
  const showEmptySearch = hasActiveSearch && filteredGuides.length === 0;

  useEffect(() => {
    if (moduleFilter) {
      setExpandedModules(new Set([moduleFilter]));
      const el = document.getElementById(`module-${moduleFilter}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [moduleFilter]);

  const toggleExpand = (moduleId: TutorialModuleId) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutoriais"
        subtitle="Aprenda a usar o Flock passo a passo."
      />

      <TutorialSearch value={searchQuery} onChange={setSearchQuery} />

      {!hasActiveSearch && (
        <TrailBanner onStartTrail={onOpenGuide} />
      )}

      {showEmptySearch ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Search size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium">Nenhum tutorial encontrado</p>
          <p className="text-sm text-gray-500 mt-1">
            Tente: membros, calendário, integração ou csv
          </p>
        </div>
      ) : hasActiveSearch ? (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {filteredGuides.map((guide) => (
            <button
              key={guide.slug}
              type="button"
              onClick={() => onOpenGuide(guide.slug)}
              className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <p className="text-sm font-medium text-gray-900">{guide.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {TUTORIAL_MODULES.find((m) => m.id === guide.module)?.label}
                {guide.trailOrder != null ? ' · Primeiros passos' : ''}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TUTORIAL_MODULES.map((mod) => {
            const moduleGuides = getGuidesByModule(mod.id);

            return (
              <ModuleCard
                key={mod.id}
                moduleId={mod.id}
                label={mod.label}
                guides={moduleGuides}
                expanded={expandedModules.has(mod.id)}
                highlighted={moduleFilter === mod.id}
                onToggleExpand={() => toggleExpand(mod.id)}
                onOpenGuide={onOpenGuide}
              />
            );
          })}
        </div>
      )}

      {!hasActiveSearch && (
        <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
          <BookOpen size={14} />
          <span>
            {TUTORIAL_MODULES.reduce(
              (acc, m) => acc + getGuidesByModule(m.id).length,
              0
            )}{' '}
            tutoriais disponíveis em {TUTORIAL_MODULES.length} módulos
          </span>
        </div>
      )}
    </div>
  );
}

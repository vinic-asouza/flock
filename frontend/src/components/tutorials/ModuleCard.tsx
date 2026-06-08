'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  Home,
  Layers,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { TutorialGuide, TutorialModuleId } from '@/lib/tutorials/types';

const MODULE_ICONS: Record<TutorialModuleId, LucideIcon> = {
  relatorios: Home,
  membros: Users,
  integracao: UserPlus,
  congregacoes: Layers,
  grupos: UserCog,
  calendario: Calendar,
};

interface ModuleCardProps {
  moduleId: TutorialModuleId;
  label: string;
  guides: TutorialGuide[];
  expanded: boolean;
  highlighted: boolean;
  onToggleExpand: () => void;
  onOpenGuide: (slug: string) => void;
}

export function ModuleCard({
  moduleId,
  label,
  guides,
  expanded,
  highlighted,
  onToggleExpand,
  onOpenGuide,
}: ModuleCardProps) {
  const Icon = MODULE_ICONS[moduleId];
  const preview = guides.slice(0, 3);
  const remaining = guides.length - preview.length;

  return (
    <div
      id={`module-${moduleId}`}
      className={`bg-white rounded-lg border p-5 transition-shadow ${
        highlighted
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-gray-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gray-50">
          <Icon size={20} className="text-gray-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{label}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {guides.length} {guides.length === 1 ? 'tutorial' : 'tutoriais'}
          </p>
        </div>
      </div>

      <ul className="space-y-2 mb-4">
        {(expanded ? guides : preview).map((guide) => (
          <li key={guide.slug}>
            <button
              type="button"
              onClick={() => onOpenGuide(guide.slug)}
              className="text-sm text-left text-gray-700 hover:text-primary transition-colors w-full"
            >
              {guide.title}
            </button>
          </li>
        ))}
        {!expanded && remaining > 0 && (
          <li className="text-xs text-gray-400">+{remaining} mais</li>
        )}
      </ul>

      {guides.length > 3 && (
        <Button variant="ghost" size="sm" onClick={onToggleExpand}>
          {expanded ? 'Ver menos' : 'Ver todos →'}
        </Button>
      )}
    </div>
  );
}
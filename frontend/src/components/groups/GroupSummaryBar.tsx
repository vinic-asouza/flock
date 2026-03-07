'use client';

import { Group } from '@/types';
import { useFiltersData } from '@/hooks/useFiltersData';

interface GroupSummaryBarProps {
  congregationId: string;
  groups: Group[];
}

export function GroupSummaryBar({ congregationId, groups }: GroupSummaryBarProps) {
  const { congregations } = useFiltersData();

  const congregationLabel =
    !congregationId
      ? 'Todas as congregações'
      : congregationId === 'sede'
        ? 'Sede'
        : congregations.find(c => c.id === congregationId)?.name ?? 'Congregação';

  const totalGroups = groups.length;
  const totalMembers = groups.reduce((sum, g) => sum + (g.memberCount ?? 0), 0);
  const emptyCount = groups.filter(g => (g.memberCount ?? 0) === 0).length;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="text-sm font-medium text-gray-800">{congregationLabel}</span>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <span>
          Resultados:
        </span>
        <span>
          {totalGroups} grupo{totalGroups !== 1 ? 's' : ''}
        </span>
        <span className="text-gray-300" aria-hidden>|</span>
        <span>
          {totalMembers === 0 ? 'Nenhum membro' : `${totalMembers} membro${totalMembers !== 1 ? 's' : ''}`}
        </span>
        <span className="text-gray-300" aria-hidden>|</span>
        <span>
          {emptyCount} vazio{emptyCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

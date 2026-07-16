'use client';

import { X, RefreshCcw } from 'lucide-react';
import { GroupFilters } from '@/types';
import { useFiltersData } from '@/hooks/useFiltersData';
import { getCongregationDisplayName } from '@/utils/congregation';

interface GroupActiveFiltersChipsProps {
  filters: GroupFilters;
  onRemoveFilter: (key: keyof GroupFilters) => void;
  onClearAll: () => void;
}

const statusLabels: Record<GroupFilters['status'], string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  all: 'Todos'
};

export function GroupActiveFiltersChips({
  filters,
  onRemoveFilter,
  onClearAll
}: GroupActiveFiltersChipsProps) {
  const { congregations } = useFiltersData();
  const activeChips: { key: keyof GroupFilters; label: string }[] = [];

  if (filters.search.trim()) {
    activeChips.push({
      key: 'search',
      label: `Busca: ${filters.search.trim()}`
    });
  }

  if (filters.congregationId) {
    const label = getCongregationDisplayName(congregations.find(c => c.id === filters.congregationId)) || 'Congregação selecionada';
    activeChips.push({
      key: 'congregationId',
      label: `Congregação: ${label}`
    });
  }

  if (filters.type) {
    activeChips.push({
      key: 'type',
      label: `Tipo: ${filters.type}`
    });
  }

  if (filters.status !== 'all') {
    activeChips.push({
      key: 'status',
      label: `Status: ${statusLabels[filters.status]}`
    });
  }

  if (activeChips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeChips.map(chip => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded-full bg-gray-200 text-gray-700"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onRemoveFilter(chip.key)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-primary transition-colors"
      >
        <RefreshCcw size={14} />
        Limpar filtros
      </button>
    </div>
  );
}

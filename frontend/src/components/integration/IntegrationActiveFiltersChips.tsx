import { X, RefreshCcw } from 'lucide-react';
import { IntegrationFilters } from '@/types';

interface IntegrationActiveFiltersChipsProps {
  filters: IntegrationFilters;
  onRemoveFilter: (key: keyof IntegrationFilters) => void;
  onClearAll: () => void;
  congregations: { id: string; name: string }[];
  mentors: { id: string; name: string }[];
}

const statusLabels: Record<'em_progresso' | 'integrado' | 'descartado', string> = {
  em_progresso: 'Em progresso',
  integrado: 'Integrado',
  descartado: 'Descartado'
};

export function IntegrationActiveFiltersChips({
  filters,
  onRemoveFilter,
  onClearAll,
  congregations,
  mentors
}: IntegrationActiveFiltersChipsProps) {
  const activeChips: { key: keyof IntegrationFilters; label: string }[] = [];

  if (filters.status !== 'todos') {
    activeChips.push({
      key: 'status',
      label: `Status: ${statusLabels[filters.status]}`
    });
  }

  if (filters.expectedCongregationId) {
    const label =
      filters.expectedCongregationId === 'sede'
        ? 'Sede'
        : congregations.find(c => c.id === filters.expectedCongregationId)?.name || 'Congregação selecionada';
    activeChips.push({
      key: 'expectedCongregationId',
      label: `Congregação: ${label}`
    });
  }

  if (filters.mentorId) {
    const mentorName = mentors.find(m => m.id === filters.mentorId)?.name || 'Responsável selecionado';
    activeChips.push({
      key: 'mentorId',
      label: `Responsável: ${mentorName}`
    });
  }

  if (!activeChips.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeChips.map(chip => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700"
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


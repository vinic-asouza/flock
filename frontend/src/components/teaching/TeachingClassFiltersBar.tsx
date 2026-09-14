'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { STATUS_OPTIONS } from './constants';

export const CLASS_SORT_OPTIONS = [
  { value: 'start_date:desc', label: 'Início (mais recente)' },
  { value: 'start_date:asc', label: 'Início (mais antigo)' },
  { value: 'created_at:desc', label: 'Data de criação' },
  { value: 'name:asc', label: 'Nome' },
] as const;

export type TeachingClassSortValue = (typeof CLASS_SORT_OPTIONS)[number]['value'];

export interface TeachingClassListFilters {
  search: string;
  status: string;
  startDateFrom: string;
  startDateTo: string;
  sort: TeachingClassSortValue;
}

export const DEFAULT_CLASS_FILTERS: TeachingClassListFilters = {
  search: '',
  status: '',
  startDateFrom: '',
  startDateTo: '',
  sort: 'start_date:desc',
};

export function parseClassSort(sort: TeachingClassSortValue): {
  sort_by: 'start_date' | 'created_at' | 'name';
  sort_order: 'asc' | 'desc';
} {
  const [sort_by, sort_order] = sort.split(':') as [
    'start_date' | 'created_at' | 'name',
    'asc' | 'desc',
  ];
  return { sort_by, sort_order };
}

export function hasActiveClassFilters(filters: TeachingClassListFilters): boolean {
  return Boolean(
    filters.search.trim() || filters.status || filters.startDateFrom || filters.startDateTo
  );
}

export function TeachingClassFiltersBar({
  filters,
  onChange,
}: {
  filters: TeachingClassListFilters;
  onChange: (changes: Partial<TeachingClassListFilters>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <div className="sm:col-span-2">
        <Input
          label="Buscar"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Nome da turma"
          className="text-base min-h-11"
        />
      </div>
      <Select
        label="Status"
        value={filters.status}
        onChange={(value) => onChange({ status: value })}
        options={[{ value: '', label: 'Todos' }, ...STATUS_OPTIONS]}
      />
      <Input
        label="Início de"
        type="date"
        value={filters.startDateFrom}
        onChange={(e) => onChange({ startDateFrom: e.target.value })}
        className="text-base min-h-11"
      />
      <Input
        label="Início até"
        type="date"
        value={filters.startDateTo}
        onChange={(e) => onChange({ startDateTo: e.target.value })}
        className="text-base min-h-11"
      />
      <Select
        label="Ordenar por"
        value={filters.sort}
        onChange={(value) => onChange({ sort: value as TeachingClassSortValue })}
        options={[...CLASS_SORT_OPTIONS]}
      />
    </div>
  );
}

'use client';

import { Group } from '@/types';
import { GroupCard } from './GroupCard';

interface GroupListProps {
  groups: Group[];
  onGroupClick: (id: string) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function GroupList({ groups, onGroupClick, hasActiveFilters = false, onClearFilters }: GroupListProps) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">Nenhum ministério encontrado</p>
        <p className="text-sm text-gray-500">
          {hasActiveFilters ? 'Nenhum resultado para os filtros aplicados.' : 'Comece criando um novo ministério.'}
        </p>
        {hasActiveFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-3 inline-flex min-h-11 items-center justify-center px-3 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Limpar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-4">
      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          onClick={() => onGroupClick(group.id)}
        />
      ))}
    </div>
  );
}

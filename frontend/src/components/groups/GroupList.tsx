'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Group } from '@/types';
import { GroupCard } from './GroupCard';

interface GroupListProps {
  groups: Group[];
  onGroupClick: (id: string) => void;
}

export function GroupList({ groups, onGroupClick }: GroupListProps) {
  // Agrupar grupos por tipo
  const groupedByType = groups.reduce((acc, group) => {
    const type = group.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(group);
    return acc;
  }, {} as Record<string, Group[]>);

  // Ordenar tipos alfabeticamente
  const sortedTypes = Object.keys(groupedByType).sort();

  // Estado para controlar quais tipos estão expandidos (por padrão, todos expandidos)
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sortedTypes.forEach(type => {
      initial[type] = true; // Todos expandidos por padrão
    });
    return initial;
  });

  const toggleType = (type: string) => {
    setExpandedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">Nenhum grupo encontrado</p>
        <p className="text-sm text-gray-500">Comece criando um novo grupo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sortedTypes.map((type, index) => {
        const isExpanded = expandedTypes[type] !== false; // Default true
        return (
          <div key={type}>
            {index > 0 && (
              <div className="border-t border-gray-200 mb-8"></div>
            )}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleType(type)}
                  className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
                  aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                >
                  {isExpanded ? (
                    <ChevronDown size={20} className="text-gray-500" />
                  ) : (
                    <ChevronUp size={20} className="text-gray-500" />
                  )}
                  <h2 className="text-xl font-semibold text-gray-900">{type}</h2>
                </button>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  {groupedByType[type].length} grupo{groupedByType[type].length !== 1 ? 's' : ''}
                </span>
              </div>
              {isExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-4 animate-in fade-in duration-200">
                  {groupedByType[type].map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onClick={() => onGroupClick(group.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

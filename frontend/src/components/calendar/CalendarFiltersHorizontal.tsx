'use client';

import { useState, useEffect, useRef } from 'react';
import { CalendarItemType, CalendarFilters as CalendarFiltersType } from '@/types/calendar';
import { useFiltersData } from '@/hooks/useFiltersData';
import { apiService } from '@/services/api';
import { Group } from '@/types';
import { ChevronDown, X } from 'lucide-react';

interface CalendarFiltersHorizontalProps {
  filters: CalendarFiltersType;
  onFiltersChange: (filters: CalendarFiltersType) => void;
}

const CALENDAR_ITEM_TYPES: CalendarItemType[] = ['Programação', 'Evento', 'Encontro', 'Reunião'];

export function CalendarFiltersHorizontal({ filters, onFiltersChange }: CalendarFiltersHorizontalProps) {
  const { congregations, loading: filtersLoading } = useFiltersData();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Carregar apenas grupos que têm itens de calendário vinculados
  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoadingGroups(true);
        const data = await apiService.listGroupsWithCalendarItems();
        setGroups(data || []);
      } catch {
        // Erro silencioso - grupos são opcionais para filtros
        setGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    };

    loadGroups();
  }, []);

  // Fechar dropdowns quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenSelect(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loading = filtersLoading || loadingGroups;

  const handleTypeChange = (type: CalendarItemType) => {
    const newTypes = [...(filters.type || []), type].filter((t, i, arr) => arr.indexOf(t) === i);
    onFiltersChange({
      ...filters,
      type: newTypes.length > 0 ? newTypes : undefined
    });
    setOpenSelect(null);
  };

  const removeType = (typeToRemove: CalendarItemType) => {
    const newTypes = (filters.type || []).filter(t => t !== typeToRemove);
    onFiltersChange({
      ...filters,
      type: newTypes.length > 0 ? newTypes : undefined
    });
  };


  const clearFilters = () => {
    // Limpar todos os filtros
    onFiltersChange({});
  };

  const hasActiveFilters = Boolean(
    filters.type?.length ||
    filters.congregation_id ||
    filters.group_id
  );

  const getTypeLabel = () => {
    if (!filters.type || filters.type.length === 0) return 'Todos os tipos';
    if (filters.type.length === 1) return filters.type[0];
    return `${filters.type.length} tipos selecionados`;
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      {/* Barra de filtros horizontal */}
      <div className="flex flex-wrap gap-4 items-start w-full">
        {/* Tipo */}
        <div className="flex flex-col gap-1">
          <label className="block text-xs font-medium text-gray-600">Tipo</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenSelect(openSelect === 'type' ? null : 'type')}
              className="inline-flex items-center justify-between w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer min-w-[160px]"
            >
              <span className="truncate">{getTypeLabel()}</span>
              <ChevronDown 
                size={16} 
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'type' ? 'rotate-180' : ''}`}
              />
            </button>
            
            {/* Dropdown de Tipo */}
            {openSelect === 'type' && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  {CALENDAR_ITEM_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        filters.type?.includes(type) ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Congregação */}
        <div className="flex flex-col gap-1">
          <label className="block text-xs font-medium text-gray-600">Congregação</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenSelect(openSelect === 'congregation' ? null : 'congregation')}
              className="inline-flex items-center justify-between w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
              disabled={loading}
            >
              <span className="truncate">
                {filters.congregation_id 
                  ? filters.congregation_id === 'sede' 
                    ? 'Sede'
                    : congregations.find(c => c.id === filters.congregation_id)?.name || 'Congregação selecionada'
                  : loading ? 'Carregando...' : 'Todas as congregações'
                }
              </span>
              <ChevronDown 
                size={16} 
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'congregation' ? 'rotate-180' : ''}`}
              />
            </button>
            
            {/* Dropdown de Congregação */}
            {openSelect === 'congregation' && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      onFiltersChange({ ...filters, congregation_id: undefined });
                      setOpenSelect(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      !filters.congregation_id ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    Todas as congregações
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onFiltersChange({ ...filters, congregation_id: 'sede' });
                      setOpenSelect(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      filters.congregation_id === 'sede' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    Sede
                  </button>
                  {loading ? (
                    <div className="px-3 py-2 text-sm text-gray-500">Carregando congregações...</div>
                  ) : (
                    congregations.map(cong => (
                      <button
                        key={cong.id}
                        type="button"
                        onClick={() => {
                          onFiltersChange({ ...filters, congregation_id: cong.id });
                          setOpenSelect(null);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                          filters.congregation_id === cong.id ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        {cong.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Grupo */}
        <div className="flex flex-col gap-1">
          <label className="block text-xs font-medium text-gray-600">Grupo / Ministério</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenSelect(openSelect === 'group' ? null : 'group')}
              className="inline-flex items-center justify-between w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
              disabled={loading}
            >
              <span className="truncate">
                {filters.group_id 
                  ? groups.find(g => g.id === filters.group_id) 
                    ? `${groups.find(g => g.id === filters.group_id)!.type}: ${groups.find(g => g.id === filters.group_id)!.name}`
                    : 'Grupo selecionado'
                  : loading ? 'Carregando...' : 'Todos os grupos'
                }
              </span>
              <ChevronDown 
                size={16} 
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'group' ? 'rotate-180' : ''}`}
              />
            </button>
            
            {/* Dropdown de Grupo */}
            {openSelect === 'group' && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      onFiltersChange({ ...filters, group_id: undefined });
                      setOpenSelect(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      !filters.group_id ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    Todos os grupos
                  </button>
                  {loading ? (
                    <div className="px-3 py-2 text-sm text-gray-500">Carregando grupos...</div>
                  ) : (
                    groups.map(group => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          onFiltersChange({ ...filters, group_id: group.id });
                          setOpenSelect(null);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                          filters.group_id === group.id ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        {group.type}: {group.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chips de filtros ativos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          {filters.type?.map(type => (
            <span
              key={type}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
            >
              {type}
              <button
                onClick={() => removeType(type)}
                className="hover:text-blue-900"
                type="button"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {filters.congregation_id && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
              {filters.congregation_id === 'sede' ? 'Sede' : congregations.find(c => c.id === filters.congregation_id)?.name || 'Congregação'}
              <button
                onClick={() => onFiltersChange({ ...filters, congregation_id: undefined })}
                className="hover:text-purple-900"
                type="button"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.group_id && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
              {groups.find(g => g.id === filters.group_id)?.name || 'Grupo'}
              <button
                onClick={() => onFiltersChange({ ...filters, group_id: undefined })}
                className="hover:text-orange-900"
                type="button"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-600 hover:text-gray-900 font-medium underline"
              type="button"
            >
              Limpar todos
            </button>
          )}
        </div>
      )}
    </div>
  );
}

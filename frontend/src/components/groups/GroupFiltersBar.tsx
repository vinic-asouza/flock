'use client';

import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { ArrowUpDown, ChevronDown, Loader } from 'lucide-react';
import { GroupFilters, GroupSorting, GroupType } from '@/types';
import { useFiltersData } from '@/hooks/useFiltersData';
import { getCongregationDisplayName } from '@/utils/congregation';

const GROUP_TYPES: GroupType[] = [
  'Ministério',
  'Departamento',
  'Grupo',
  'Equipe',
  'Time',
  'Comissão',
  'Célula',
  'Grupo de Crescimento',
  'Pequeno Grupo',
  'Discipulado',
  'Classe',
  'Núcleo',
  'Região'
];

const statusLabels: Record<GroupFilters['status'], string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  all: 'Todos'
};

const SORT_LABELS: Record<GroupSorting['sort_by'], string> = {
  name: 'Nome',
  type: 'Tipo',
  created_at: 'Data de Criação',
  updated_at: 'Data de Atualização',
  status: 'Status'
};

interface GroupFiltersBarProps {
  filters: GroupFilters;
  onChange: (changes: Partial<GroupFilters>) => void;
  sorting: GroupSorting;
  onSortingChange: (sorting: GroupSorting) => void;
}

export function GroupFiltersBar({ filters, onChange, sorting, onSortingChange }: GroupFiltersBarProps) {
  const { congregations, loading: filtersLoading, error } = useFiltersData();
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownPortalRef = useRef<HTMLDivElement>(null);
  const congregationTriggerRef = useRef<HTMLButtonElement>(null);
  const typeTriggerRef = useRef<HTMLButtonElement>(null);
  const statusTriggerRef = useRef<HTMLButtonElement>(null);
  const sortTriggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPlacement, setDropdownPlacement] = useState<{ top: number; left: number; width: number } | null>(null);

  const activeDropdown = openSelect;
  const triggerRef =
    activeDropdown === 'congregation'
      ? congregationTriggerRef
      : activeDropdown === 'type'
        ? typeTriggerRef
        : activeDropdown === 'status'
          ? statusTriggerRef
          : activeDropdown === 'sorting'
            ? sortTriggerRef
            : null;

  const updateDropdownPlacement = useCallback(() => {
    if (!activeDropdown || !triggerRef?.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = activeDropdown === 'congregation' ? 240 : 192;
    setDropdownPlacement({
      top: rect.bottom + 4,
      left: rect.right - width,
      width,
    });
  }, [activeDropdown, triggerRef]);

  useLayoutEffect(() => {
    if (!activeDropdown || !triggerRef?.current) {
      setDropdownPlacement(null);
      return;
    }
    updateDropdownPlacement();
  }, [activeDropdown, openSelect, triggerRef, updateDropdownPlacement]);

  useEffect(() => {
    if (!activeDropdown) return;
    window.addEventListener('scroll', updateDropdownPlacement, true);
    window.addEventListener('resize', updateDropdownPlacement);
    return () => {
      window.removeEventListener('scroll', updateDropdownPlacement, true);
      window.removeEventListener('resize', updateDropdownPlacement);
    };
  }, [activeDropdown, updateDropdownPlacement]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || dropdownPortalRef.current?.contains(target)) return;
      setOpenSelect(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (key: string) => {
    setOpenSelect(prev => (prev === key ? null : key));
  };

  const handleSortingChange = (sortBy: GroupSorting['sort_by'], sortOrder: 'asc' | 'desc') => {
    onSortingChange({ sort_by: sortBy, sort_order: sortOrder });
    setOpenSelect(null);
  };

  const getOrderHint = (field: GroupSorting['sort_by'], order: 'asc' | 'desc') => {
    if (field === 'name' || field === 'type') {
      return order === 'asc' ? 'A-Z' : 'Z-A';
    }
    if (field === 'status') {
      return order === 'asc' ? 'Inativo→Ativo' : 'Ativo→Inativo';
    }
    return order === 'asc' ? 'Antiga' : 'Recente';
  };

  if (filtersLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader className="animate-spin" size={16} />
        Carregando filtros...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm">
        Erro ao carregar filtros: {error}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-nowrap gap-2 items-end overflow-visible">
      {/* Congregação */}
      <div className="flex flex-col gap-1 overflow-visible">
        <label className="block text-xs font-medium text-gray-600">Congregação</label>
        <div className="relative overflow-visible">
          <button
            ref={congregationTriggerRef}
            type="button"
            onClick={() => handleToggle('congregation')}
            className="h-10 inline-flex items-center justify-between w-full min-w-0 px-3 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={filtersLoading}
          >
            <span>
              {filters.congregationId
                ? getCongregationDisplayName(congregations.find(c => c.id === filters.congregationId)) || 'Congregação selecionada'
                : 'Todas as congregações'}
            </span>
            <ChevronDown
              size={16}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'congregation' ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Tipo */}
      <div className="flex flex-col gap-1 overflow-visible">
        <label className="block text-xs font-medium text-gray-600">Tipo</label>
        <div className="relative overflow-visible">
          <button
            ref={typeTriggerRef}
            type="button"
            onClick={() => handleToggle('type')}
            className="h-10 inline-flex items-center justify-between w-full min-w-0 px-3 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
          >
            <span>{filters.type || 'Todos os tipos'}</span>
            <ChevronDown
              size={16}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'type' ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1 overflow-visible">
        <label className="block text-xs font-medium text-gray-600">Status</label>
        <div className="relative overflow-visible">
          <button
            ref={statusTriggerRef}
            type="button"
            onClick={() => handleToggle('status')}
            className="h-10 inline-flex items-center justify-between w-full min-w-0 px-3 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
          >
            <span>{statusLabels[filters.status]}</span>
            <ChevronDown
              size={16}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'status' ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Ordenar */}
      <div className="flex flex-col gap-1 overflow-visible">
        <label className="block text-xs font-medium text-gray-600">Ordenar por</label>
        <div className="relative overflow-visible">
          <button
            ref={sortTriggerRef}
            type="button"
            onClick={() => handleToggle('sorting')}
            className="h-10 inline-flex items-center gap-2 px-3 border border-gray-200 rounded-lg text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors min-w-0"
          >
            <ArrowUpDown size={16} />
            {SORT_LABELS[sorting.sort_by]}
            <ChevronDown size={16} className={`transition-transform duration-200 ${openSelect === 'sorting' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Portal: dropdowns sobrepostos */}
      {dropdownPlacement &&
        activeDropdown &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownPortalRef}
            className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[12rem] max-h-[min(20rem,80vh)] overflow-y-auto"
            style={{
              position: 'fixed',
              top: dropdownPlacement.top,
              left: dropdownPlacement.left,
              width: dropdownPlacement.width,
              zIndex: 9999,
            }}
          >
            {activeDropdown === 'congregation' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ congregationId: '' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!filters.congregationId ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Todas as congregações
                </button>
                {congregations.map(cong => (
                  <button
                    key={cong.id}
                    type="button"
                    onClick={() => {
                      onChange({ congregationId: cong.id });
                      setOpenSelect(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.congregationId === cong.id ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                  >
                    {getCongregationDisplayName(cong)}
                  </button>
                ))}
              </>
            )}
            {activeDropdown === 'type' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ type: '' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!filters.type ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Todos os tipos
                </button>
                {GROUP_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onChange({ type: t });
                      setOpenSelect(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.type === t ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                  >
                    {t}
                  </button>
                ))}
              </>
            )}
            {activeDropdown === 'status' && (
              <>
                {(['active', 'inactive', 'all'] as const).map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange({ status: option });
                      setOpenSelect(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.status === option ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                  >
                    {statusLabels[option]}
                  </button>
                ))}
              </>
            )}
            {activeDropdown === 'sorting' && (
              <>
                {(Object.keys(SORT_LABELS) as GroupSorting['sort_by'][]).map(field => (
                  <button
                    key={field}
                    type="button"
                    onClick={() =>
                      handleSortingChange(
                        field,
                        sorting.sort_by === field && sorting.sort_order === 'desc' ? 'asc' : 'desc'
                      )
                    }
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${sorting.sort_by === field ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                  >
                    <span>{SORT_LABELS[field]}</span>
                    {sorting.sort_by === field && (
                      <span className="text-xs text-gray-500">{getOrderHint(field, sorting.sort_order)}</span>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

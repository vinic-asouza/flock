'use client';

import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, Loader } from 'lucide-react';
import { GroupFilters, GroupType } from '@/types';
import { useFiltersData } from '@/hooks/useFiltersData';

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

interface GroupFiltersBarProps {
  filters: GroupFilters;
  onChange: (changes: Partial<GroupFilters>) => void;
}

export function GroupFiltersBar({ filters, onChange }: GroupFiltersBarProps) {
  const { congregations, loading: filtersLoading, error } = useFiltersData();
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownPortalRef = useRef<HTMLDivElement>(null);
  const congregationTriggerRef = useRef<HTMLButtonElement>(null);
  const typeTriggerRef = useRef<HTMLButtonElement>(null);
  const statusTriggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPlacement, setDropdownPlacement] = useState<{ top: number; left: number; width: number } | null>(null);

  const activeDropdown = openSelect;
  const triggerRef =
    activeDropdown === 'congregation'
      ? congregationTriggerRef
      : activeDropdown === 'type'
        ? typeTriggerRef
        : activeDropdown === 'status'
          ? statusTriggerRef
          : null;

  const updateDropdownPlacement = useCallback(() => {
    if (!activeDropdown || !triggerRef?.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = activeDropdown === 'congregation' ? 240 : 192;
    setDropdownPlacement({
      top: rect.bottom + 4,
      left: rect.right - width, // alinhar dropdown à direita do seletor
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

  // Atualizar posição do dropdown ao rolar ou redimensionar (mantém alinhado ao seletor)
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
                ? congregations.find(c => c.id === filters.congregationId)?.name || 'Congregação selecionada'
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
                    {cong.name}
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
          </div>,
          document.body
        )}
    </div>
  );
}

'use client';

import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { IntegrationFilters } from '@/types';

interface IntegrationFiltersBarProps {
  filters: IntegrationFilters;
  onChange: (changes: Partial<IntegrationFilters>) => void;
  congregations: { id: string; name: string }[];
  filtersLoading?: boolean;
  filtersError?: string | null;
}

const statusLabels: Record<NonNullable<IntegrationFilters['status']>, string> = {
  todos: 'Todos',
  em_progresso: 'Em progresso',
  integrado: 'Integrado',
  descartado: 'Descartado'
};

const statusOptions: Array<NonNullable<IntegrationFilters['status']>> = [
  'todos',
  'em_progresso',
  'integrado',
  'descartado'
];

export function IntegrationFiltersBar({
  filters,
  onChange,
  congregations,
}: IntegrationFiltersBarProps) {
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownPortalRef = useRef<HTMLDivElement>(null);
  const statusTriggerRef = useRef<HTMLButtonElement>(null);
  const congregationTriggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPlacement, setDropdownPlacement] = useState<{ top: number; left: number; width: number } | null>(null);

  const activeDropdown = openSelect;
  const triggerRef = activeDropdown === 'status' ? statusTriggerRef : activeDropdown === 'congregation' ? congregationTriggerRef : null;

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

  const currentStatus = filters.status ?? 'todos';

  return (
    <div ref={containerRef} className="flex flex-nowrap gap-2 items-end overflow-visible">
      <div className="flex flex-col gap-1 overflow-visible">
        <label className="block text-xs font-medium text-gray-600">Status</label>
        <div className="relative overflow-visible">
          <button
            ref={statusTriggerRef}
            type="button"
            onClick={() => handleToggle('status')}
            className="h-10 inline-flex items-center justify-between w-full min-w-0 px-3 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
          >
            <span>{statusLabels[currentStatus]}</span>
            <ChevronDown
              size={16}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'status' ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 overflow-visible">
        <label className="block text-xs font-medium text-gray-600">Congregação prevista</label>
        <div className="relative overflow-visible">
          <button
            ref={congregationTriggerRef}
            type="button"
            onClick={() => handleToggle('congregation')}
            className="h-10 inline-flex items-center justify-between w-full min-w-0 px-3 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
          >
            <span>
              {filters.expectedCongregationId
                ? filters.expectedCongregationId === 'sede'
                  ? 'Sede'
                  : congregations.find(c => c.id === filters.expectedCongregationId)?.name || 'Congregação selecionada'
                : 'Todas as congregações'}
            </span>
            <ChevronDown
              size={16}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'congregation' ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Portal: dropdowns sobrepostos */}
      {dropdownPlacement && activeDropdown && typeof document !== 'undefined' && createPortal(
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
          {activeDropdown === 'status' && (
            <>
              {statusOptions.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange({ status: option });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${currentStatus === option ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  {statusLabels[option]}
                </button>
              ))}
            </>
          )}
          {activeDropdown === 'congregation' && (
            <>
              <button
                type="button"
                onClick={() => {
                  onChange({ expectedCongregationId: '' });
                  setOpenSelect(null);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!filters.expectedCongregationId ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
              >
                Todas as congregações
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange({ expectedCongregationId: 'sede' });
                  setOpenSelect(null);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.expectedCongregationId === 'sede' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
              >
                Sede
              </button>
              {congregations.map(congregation => (
                <button
                  key={congregation.id}
                  type="button"
                  onClick={() => {
                    onChange({ expectedCongregationId: congregation.id });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.expectedCongregationId === congregation.id ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  {congregation.name}
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


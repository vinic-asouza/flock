'use client';

import { createPortal } from 'react-dom';
import { ChevronDown, Filter, ArrowUpDown, Loader } from 'lucide-react';
import { MemberFilters } from '@/app/(main)/members/page';
import { useFiltersData } from '@/hooks/useFiltersData';
import { Congregation } from '@/types/congregation';
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';

interface MemberFiltersBarProps {
  filters: MemberFilters;
  onChange: (changes: Partial<MemberFilters>) => void;
  onShowAdvanced: () => void;
  showAdvanced: boolean;
  sorting: {
    sort_by: string;
    sort_order: 'asc' | 'desc';
  };
  onSortingChange: (sorting: { sort_by: string; sort_order: 'asc' | 'desc' }) => void;
  /** Quando passado pela página de membros, evita carregamento separado */
  congregations?: Congregation[];
  filtersLoading?: boolean;
  filtersError?: string | null;
}

export function MemberFiltersBar({ 
  filters, 
  onChange, 
  onShowAdvanced, 
  showAdvanced, 
  sorting, 
  onSortingChange,
  congregations: congregationsProp,
  filtersLoading: filtersLoadingProp,
  filtersError: filtersErrorProp,
}: MemberFiltersBarProps) {
  const fromHook = useFiltersData();
  const congregations = congregationsProp !== undefined ? congregationsProp : fromHook.congregations;
  const filtersLoading = filtersLoadingProp !== undefined ? filtersLoadingProp : fromHook.loading;
  const error = filtersErrorProp !== undefined ? filtersErrorProp : fromHook.error;
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const [showSortingDropdown, setShowSortingDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownPortalRef = useRef<HTMLDivElement>(null);
  const statusTriggerRef = useRef<HTMLButtonElement>(null);
  const congregationTriggerRef = useRef<HTMLButtonElement>(null);
  const sortTriggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPlacement, setDropdownPlacement] = useState<{ top: number; left: number; width: number } | null>(null);

  // Posicionar dropdown sobreposto (portal)
  const activeDropdown = openSelect === 'status' ? 'status' : openSelect === 'congregation' ? 'congregation' : showSortingDropdown ? 'sorting' : null;
  const triggerRef = activeDropdown === 'status' ? statusTriggerRef : activeDropdown === 'congregation' ? congregationTriggerRef : sortTriggerRef;

  const updateDropdownPlacement = useCallback(() => {
    if (!activeDropdown || !triggerRef?.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 192;
    setDropdownPlacement({
      top: rect.bottom + 4,
      left: rect.right - width,
      width,
    });
  }, [activeDropdown, triggerRef]);

  useLayoutEffect(() => {
    if (!activeDropdown || !triggerRef.current) {
      setDropdownPlacement(null);
      return;
    }
    updateDropdownPlacement();
  }, [activeDropdown, openSelect, showSortingDropdown, triggerRef, updateDropdownPlacement]);

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

  // Fechar dropdowns quando clicar fora (barra ou portal do dropdown)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || dropdownPortalRef.current?.contains(target)) return;
      setOpenSelect(null);
      setShowSortingDropdown(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const handleSortingChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    onSortingChange({ sort_by: sortBy, sort_order: sortOrder });
    setShowSortingDropdown(false);
  };

  const getSortingLabel = () => {
    const labels = {
      name: 'Nome',
      birth: 'Idade',
      baptism_date: 'Data de Batismo',
      admission_date: 'Data de Recebimento',
      created_at: 'Data de Criação'
    };
    return labels[sorting.sort_by as keyof typeof labels] || 'Ordenar';
  };

  return (
    <div ref={containerRef} className="flex flex-nowrap gap-2 items-center overflow-visible">
      {/* Status */}
      <div className="flex flex-col gap-1 overflow-visible">
        <label className="block text-xs font-medium text-gray-600">Status</label>
        <div className="relative overflow-visible">
          <button
            ref={statusTriggerRef}
            type="button"
            onClick={() => setOpenSelect(openSelect === 'status' ? null : 'status')}
            className="h-10 inline-flex items-center justify-between w-full min-w-0 px-3 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
          >
            <span>
              {filters.status === 'active' ? 'Ativo' : filters.status === 'inactive' ? 'Inativo' : 'Todos'}
            </span>
            <ChevronDown 
              size={16} 
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'status' ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>
      
      {/* Congregação */}
      <div className="flex flex-col gap-1 overflow-visible">
        <label className="block text-xs font-medium text-gray-600">Congregação</label>
        <div className="relative overflow-visible">
          <button
            ref={congregationTriggerRef}
            type="button"
            onClick={() => setOpenSelect(openSelect === 'congregation' ? null : 'congregation')}
            className="h-10 inline-flex items-center justify-between w-full min-w-0 px-3 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={filtersLoading}
          >
            <span>
              {filters.congregationId 
                ? congregations.find(c => c.id === filters.congregationId)?.name || 'Congregação selecionada'
                : filtersLoading ? 'Carregando...' : 'Todas as congregações'
              }
            </span>
            <ChevronDown 
              size={16} 
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'congregation' ? 'rotate-180' : ''}`}
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
            onClick={() => setShowSortingDropdown(!showSortingDropdown)}
            className="h-10 inline-flex items-center gap-2 px-3 border border-gray-200 rounded-lg text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors min-w-0"
          >
            <ArrowUpDown size={16} />
            {getSortingLabel()}
            <ChevronDown size={16} className={`transition-transform duration-200 ${showSortingDropdown ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Mais opções */}
      <div className="flex flex-col gap-1 overflow-visible">
        <label className="block text-xs font-medium text-gray-600 opacity-0">Ações</label>
        <button
          type="button"
          onClick={onShowAdvanced}
          className={`h-10 inline-flex items-center gap-2 px-3 border border-gray-200 rounded-lg text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors min-w-0 ${showAdvanced ? 'bg-gray-50 border-gray-300' : ''}`}
        >
          <Filter size={16} />
          Mais opções
          <ChevronDown size={16} className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
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
              <button
                type="button"
                onClick={() => { onChange({ status: 'active' }); setOpenSelect(null); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.status === 'active' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
              >
                Ativo
              </button>
              <button
                type="button"
                onClick={() => { onChange({ status: 'inactive' }); setOpenSelect(null); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.status === 'inactive' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
              >
                Inativo
              </button>
              <button
                type="button"
                onClick={() => { onChange({ status: 'all' }); setOpenSelect(null); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.status === 'all' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
              >
                Todos
              </button>
            </>
          )}
          {activeDropdown === 'congregation' && (
            <>
              <button
                type="button"
                onClick={() => { onChange({ congregationId: '' }); setOpenSelect(null); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!filters.congregationId ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
              >
                Todas as congregações
              </button>
              {!filtersLoading && congregations.map(cong => (
                <button
                  key={cong.id}
                  type="button"
                  onClick={() => { onChange({ congregationId: cong.id }); setOpenSelect(null); }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.congregationId === cong.id ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  {cong.name}
                </button>
              ))}
            </>
          )}
          {activeDropdown === 'sorting' && (
            <>
              <button
                type="button"
                onClick={() => handleSortingChange('name', sorting.sort_by === 'name' && sorting.sort_order === 'desc' ? 'asc' : 'desc')}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${sorting.sort_by === 'name' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
              >
                <span>Nome</span>
                {sorting.sort_by === 'name' && <span className="text-xs text-gray-500">{sorting.sort_order === 'asc' ? 'A-Z' : 'Z-A'}</span>}
              </button>
              <button
                type="button"
                onClick={() => handleSortingChange('birth', sorting.sort_by === 'birth' && sorting.sort_order === 'desc' ? 'asc' : 'desc')}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${sorting.sort_by === 'birth' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
              >
                <span>Idade</span>
                {sorting.sort_by === 'birth' && <span className="text-xs text-gray-500">{sorting.sort_order === 'asc' ? 'Menor' : 'Maior'}</span>}
              </button>
              <button
                type="button"
                onClick={() => handleSortingChange('baptism_date', sorting.sort_by === 'baptism_date' && sorting.sort_order === 'desc' ? 'asc' : 'desc')}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${sorting.sort_by === 'baptism_date' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
              >
                <span>Data de Batismo</span>
                {sorting.sort_by === 'baptism_date' && <span className="text-xs text-gray-500">{sorting.sort_order === 'asc' ? 'Antiga' : 'Recente'}</span>}
              </button>
              <button
                type="button"
                onClick={() => handleSortingChange('admission_date', sorting.sort_by === 'admission_date' && sorting.sort_order === 'desc' ? 'asc' : 'desc')}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${sorting.sort_by === 'admission_date' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
              >
                <span>Data de Recebimento</span>
                {sorting.sort_by === 'admission_date' && <span className="text-xs text-gray-500">{sorting.sort_order === 'asc' ? 'Antiga' : 'Recente'}</span>}
              </button>
              <button
                type="button"
                onClick={() => handleSortingChange('created_at', sorting.sort_by === 'created_at' && sorting.sort_order === 'desc' ? 'asc' : 'desc')}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${sorting.sort_by === 'created_at' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
              >
                <span>Data de Criação</span>
                {sorting.sort_by === 'created_at' && <span className="text-xs text-gray-500">{sorting.sort_order === 'asc' ? 'Antiga' : 'Recente'}</span>}
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
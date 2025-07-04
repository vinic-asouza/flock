'use client';

import { ChevronDown, Filter, ArrowUpDown, Loader } from 'lucide-react';
import { MemberFilters } from '@/app/(main)/members/page';
import { useFiltersData } from '@/hooks/useFiltersData';
import { useState, useEffect, useRef } from 'react';

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
}

export function MemberFiltersBar({ 
  filters, 
  onChange, 
  onShowAdvanced, 
  showAdvanced, 
  sorting, 
  onSortingChange 
}: MemberFiltersBarProps) {
  const { roles, congregations, loading, error } = useFiltersData();
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const [showSortingDropdown, setShowSortingDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar dropdowns quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenSelect(null);
        setShowSortingDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
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
      admission_date: 'Data de Admissão'
    };
    return labels[sorting.sort_by as keyof typeof labels] || 'Ordenar';
  };

  return (
    <div ref={containerRef} className="flex flex-wrap gap-4 items-start w-full">
      {/* Status */}
      <div className="flex flex-col gap-1">
        <label className="block text-xs font-medium text-gray-600">Status</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenSelect(openSelect === 'status' ? null : 'status')}
            className="inline-flex items-center justify-between w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
          >
            <span>
              {filters.status === 'active' ? 'Ativo' : filters.status === 'inactive' ? 'Inativo' : 'Todos'}
            </span>
            <ChevronDown 
              size={16} 
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'status' ? 'rotate-180' : ''}`}
            />
          </button>
          
          {/* Dropdown de Status */}
          {openSelect === 'status' && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    onChange({ status: 'active' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.status === 'active' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Ativo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ status: 'inactive' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.status === 'inactive' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Inativo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ status: 'all' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.status === 'all' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Todos
                </button>
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
            className="inline-flex items-center justify-between w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
          >
            <span>
              {filters.congregationId ? congregations.find(c => c.id === filters.congregationId)?.name || 'Todas as congregações' : 'Todas as congregações'}
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Função */}
      <div className="flex flex-col gap-1">
        <label className="block text-xs font-medium text-gray-600">Função</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenSelect(openSelect === 'role' ? null : 'role')}
            className="inline-flex items-center justify-between w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
          >
            <span>
              {filters.roleId ? roles.find(r => r.id === filters.roleId)?.name || 'Todas as funções' : 'Todas as funções'}
            </span>
            <ChevronDown 
              size={16} 
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform duration-200 ${openSelect === 'role' ? 'rotate-180' : ''}`}
            />
          </button>
          
          {/* Dropdown de Função */}
          {openSelect === 'role' && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    onChange({ roleId: '' });
                    setOpenSelect(null);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!filters.roleId ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  Todas as funções
                </button>
                {roles.map(role => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      onChange({ roleId: role.id });
                      setOpenSelect(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filters.roleId === role.id ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mais opções */}
      <div className="flex flex-col gap-1">
        <label className="block text-xs font-medium text-gray-600 opacity-0">Ações</label>
        <button
          type="button"
          onClick={onShowAdvanced}
          className={`inline-flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors ${showAdvanced ? 'bg-gray-50 border-gray-300' : ''}`}
        >
          <Filter size={16} />
          Mais opções
          <ChevronDown size={16} className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      {/* Ordenar */}
      <div className="flex flex-col gap-1">
        <label className="block text-xs font-medium text-gray-600 opacity-0">Ordenação</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSortingDropdown(!showSortingDropdown)}
            className="inline-flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <ArrowUpDown size={16} />
            {getSortingLabel()}
            <ChevronDown size={16} className={`transition-transform duration-200 ${showSortingDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Dropdown de ordenação */}
          {showSortingDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="py-1">
                {/* Nome */}
                <button
                  type="button"
                  onClick={() => handleSortingChange('name', sorting.sort_by === 'name' && sorting.sort_order === 'asc' ? 'desc' : 'asc')}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${sorting.sort_by === 'name' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  <span>Nome</span>
                  {sorting.sort_by === 'name' && (
                    <span className="text-xs text-gray-500">
                      {sorting.sort_order === 'asc' ? 'A-Z' : 'Z-A'}
                    </span>
                  )}
                </button>
                
                {/* Idade */}
                <button
                  type="button"
                  onClick={() => handleSortingChange('birth', sorting.sort_by === 'birth' && sorting.sort_order === 'asc' ? 'desc' : 'asc')}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${sorting.sort_by === 'birth' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  <span>Idade</span>
                  {sorting.sort_by === 'birth' && (
                    <span className="text-xs text-gray-500">
                      {sorting.sort_order === 'asc' ? 'Menor' : 'Maior'}
                    </span>
                  )}
                </button>
                
                {/* Data de Batismo */}
                <button
                  type="button"
                  onClick={() => handleSortingChange('baptism_date', sorting.sort_by === 'baptism_date' && sorting.sort_order === 'asc' ? 'desc' : 'asc')}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${sorting.sort_by === 'baptism_date' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  <span>Data de Batismo</span>
                  {sorting.sort_by === 'baptism_date' && (
                    <span className="text-xs text-gray-500">
                      {sorting.sort_order === 'asc' ? 'Antiga' : 'Recente'}
                    </span>
                  )}
                </button>
                
                {/* Data de Admissão */}
                <button
                  type="button"
                  onClick={() => handleSortingChange('admission_date', sorting.sort_by === 'admission_date' && sorting.sort_order === 'asc' ? 'desc' : 'asc')}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${sorting.sort_by === 'admission_date' ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`}
                >
                  <span>Data de Admissão</span>
                  {sorting.sort_by === 'admission_date' && (
                    <span className="text-xs text-gray-500">
                      {sorting.sort_order === 'asc' ? 'Antiga' : 'Recente'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
'use client';

import { X, Trash2 } from 'lucide-react';
import { MemberFilters } from '@/app/(main)/members/page';
import { useFiltersData } from '@/hooks/useFiltersData';

interface ActiveFiltersChipsProps {
  filters: MemberFilters;
  onRemoveFilter: (filterKey: keyof MemberFilters) => void;
  onClearAll: () => void;
  sorting?: {
    sort_by: string;
    sort_order: 'asc' | 'desc';
  };
  onRemoveSorting?: () => void;
  defaultSorting?: {
    sort_by: string;
    sort_order: 'asc' | 'desc';
  };
}

export function ActiveFiltersChips({ 
  filters, 
  onRemoveFilter, 
  onClearAll, 
  sorting, 
  onRemoveSorting,
  defaultSorting = { sort_by: 'created_at', sort_order: 'desc' }
}: ActiveFiltersChipsProps) {
  const { roles, congregations } = useFiltersData();

  // Função para obter o label de ordenação
  const getSortingLabel = () => {
    if (!sorting) return null;
    
    const labels = {
      name: 'Nome',
      birth: 'Idade',
      baptism_date: 'Data de Batismo',
      admission_date: 'Data de Admissão',
      created_at: 'Data de Cadastro'
    };
    
    const fieldLabel = labels[sorting.sort_by as keyof typeof labels] || sorting.sort_by;
    const orderLabel = sorting.sort_order === 'asc' ? 'Crescente' : 'Decrescente';
    
    return `${fieldLabel} (${orderLabel})`;
  };

  // Função para obter o label de um filtro
  const getFilterLabel = (key: keyof MemberFilters, value: string) => {
    switch (key) {
      case 'status':
        return value === 'active' ? 'Ativo' : value === 'inactive' ? 'Inativo' : 'Todos';
      case 'roleId':
        const role = roles.find(r => r.id === value);
        return role ? role.name : '';
      case 'congregationId':
        if (value === 'sede') {
          return 'Sede';
        }
        const congregation = congregations.find(c => c.id === value);
        return congregation ? congregation.name : '';
      case 'gender':
        return value;
      case 'maritalStatus':
        return value;
      case 'nationality':
        return `Nacionalidade: ${value}`;
      case 'state':
        return `Estado: ${value}`;
      case 'city':
        return `Cidade: ${value}`;
      case 'neighborhood':
        return `Bairro: ${value}`;
      case 'ageFrom':
        return filters.ageTo ? `Idade: ${value} - ${filters.ageTo}` : `Idade: ${value}+`;
      case 'ageTo':
        return filters.ageFrom ? null : `Idade: até ${value}`; // Não mostrar se já há "de"
      case 'occupation':
        return `Ocupação: ${value}`;
      case 'birthDateFrom':
        return filters.birthDateTo ? 
          `Nascimento: ${new Date(value).toLocaleDateString('pt-BR')} - ${new Date(filters.birthDateTo).toLocaleDateString('pt-BR')}` : 
          `Nascimento: de ${new Date(value).toLocaleDateString('pt-BR')}`;
      case 'birthDateTo':
        return filters.birthDateFrom ? null : `Nascimento: até ${new Date(value).toLocaleDateString('pt-BR')}`;
      case 'baptismDateFrom':
        return filters.baptismDateTo ? 
          `Batismo: ${new Date(value).toLocaleDateString('pt-BR')} - ${new Date(filters.baptismDateTo).toLocaleDateString('pt-BR')}` : 
          `Batismo: de ${new Date(value).toLocaleDateString('pt-BR')}`;
      case 'baptismDateTo':
        return filters.baptismDateFrom ? null : `Batismo: até ${new Date(value).toLocaleDateString('pt-BR')}`;
      case 'admissionDateFrom':
        return filters.admissionDateTo ? 
          `Admissão: ${new Date(value).toLocaleDateString('pt-BR')} - ${new Date(filters.admissionDateTo).toLocaleDateString('pt-BR')}` : 
          `Admissão: de ${new Date(value).toLocaleDateString('pt-BR')}`;
      case 'admissionDateTo':
        return filters.admissionDateFrom ? null : `Admissão: até ${new Date(value).toLocaleDateString('pt-BR')}`;
      default:
        return value;
    }
  };

  // Função para verificar se um filtro está ativo
  const isFilterActive = (key: keyof MemberFilters, value: string) => {
    if (key === 'status') {
      return value !== 'active'; // 'active' é o padrão
    }
    if (key === 'search') {
      return value.trim() !== '';
    }
    if (key === 'ageFrom' || key === 'ageTo') {
      return value.trim() !== '';
    }
    if (key === 'baptismDateFrom' || key === 'baptismDateTo' || 
        key === 'admissionDateFrom' || key === 'admissionDateTo') {
      return value.trim() !== '';
    }
    return value.trim() !== '';
  };

  // Obter filtros ativos com lógica especial para idade e datas
  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    if (key === 'ageFrom' || key === 'ageTo') {
      // Só mostrar se ambos os campos de idade estão preenchidos ou se há um range válido
      const ageFrom = filters.ageFrom;
      const ageTo = filters.ageTo;
      if (key === 'ageFrom' && ageFrom && ageTo) {
        return true; // Mostrar apenas o "de"
      }
      if (key === 'ageTo' && ageTo && !ageFrom) {
        return true; // Mostrar apenas o "até" se não há "de"
      }
      return false;
    }
    if (key === 'birthDateFrom' || key === 'birthDateTo') {
      const birthFrom = filters.birthDateFrom;
      const birthTo = filters.birthDateTo;
      if (key === 'birthDateFrom' && birthFrom && birthTo) {
        return true; // Mostrar apenas o "de"
      }
      if (key === 'birthDateTo' && birthTo && !birthFrom) {
        return true; // Mostrar apenas o "até" se não há "de"
      }
      return false;
    }
    if (key === 'baptismDateFrom' || key === 'baptismDateTo') {
      const baptismFrom = filters.baptismDateFrom;
      const baptismTo = filters.baptismDateTo;
      if (key === 'baptismDateFrom' && baptismFrom && baptismTo) {
        return true; // Mostrar apenas o "de"
      }
      if (key === 'baptismDateTo' && baptismTo && !baptismFrom) {
        return true; // Mostrar apenas o "até" se não há "de"
      }
      return false;
    }
    if (key === 'admissionDateFrom' || key === 'admissionDateTo') {
      const admissionFrom = filters.admissionDateFrom;
      const admissionTo = filters.admissionDateTo;
      if (key === 'admissionDateFrom' && admissionFrom && admissionTo) {
        return true; // Mostrar apenas o "de"
      }
      if (key === 'admissionDateTo' && admissionTo && !admissionFrom) {
        return true; // Mostrar apenas o "até" se não há "de"
      }
      return false;
    }
    return isFilterActive(key as keyof MemberFilters, value);
  });

  // Verificar se há ordenação ativa (diferente da padrão)
  const hasActiveSorting = sorting && (
    sorting.sort_by !== defaultSorting.sort_by || 
    sorting.sort_order !== defaultSorting.sort_order
  );
  const sortingLabel = getSortingLabel();

  if (activeFilters.length === 0 && !hasActiveSorting) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <span className="text-sm font-medium text-gray-600">Filtros ativos:</span>
      
      {activeFilters.map(([key, value]) => {
        const label = getFilterLabel(key as keyof MemberFilters, value);
        if (!label) return null;

        return (
          <div
            key={key}
            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md border border-gray-200"
          >
            <span>{label}</span>
            <button
              type="button"
              onClick={() => onRemoveFilter(key as keyof MemberFilters)}
              className="ml-1 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}

      {/* Chip de ordenação */}
      {hasActiveSorting && sortingLabel && onRemoveSorting && (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md border border-gray-200">
          <span>Ordenar por: {sortingLabel}</span>
          <button
            type="button"
            onClick={onRemoveSorting}
            className="ml-1 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}
      
      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 px-2 py-1 text-gray-500 text-xs font-medium hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
      >
        <Trash2 size={12} />
        Limpar todos
      </button>
    </div>
  );
} 
'use client';

import { X, RefreshCcw } from 'lucide-react';
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
  const { congregations } = useFiltersData();

  // Função para obter o label de ordenação
  const getSortingLabel = () => {
    if (!sorting) return null;
    
    const labels = {
      name: 'Nome',
      birth: 'Idade',
      baptism_date: 'Data de Batismo',
      admission_date: 'Data de Recebimento',
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
      case 'birthDateFrom': {
        const format = (v: string) => {
          if (!v) return '';
          if (v.includes('/')) return v;
          const part = v.includes('T') ? v.split('T')[0] : v;
          const m = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (m) return `${m[3]}/${m[2]}/${m[1]}`;
          const d = new Date(v);
          return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        };
        return filters.birthDateTo
          ? `Nascimento: ${format(value)} - ${format(filters.birthDateTo)}`
          : `Nascimento: de ${format(value)}`;
      }
      case 'birthDateTo': {
        if (filters.birthDateFrom) return null;
        const v = value;
        if (!v) return null;
        const part = v.includes('T') ? v.split('T')[0] : v;
        const m = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const formatted = m ? `${m[3]}/${m[2]}/${m[1]}` : new Date(v).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        return `Nascimento: até ${formatted}`;
      }
      case 'baptismDateFrom': {
        const format = (v: string) => {
          if (!v) return '';
          if (v.includes('/')) return v;
          const part = v.includes('T') ? v.split('T')[0] : v;
          const m = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (m) return `${m[3]}/${m[2]}/${m[1]}`;
          const d = new Date(v);
          return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        };
        return filters.baptismDateTo
          ? `Batismo: ${format(value)} - ${format(filters.baptismDateTo)}`
          : `Batismo: de ${format(value)}`;
      }
      case 'baptismDateTo': {
        if (filters.baptismDateFrom) return null;
        const v = value;
        if (!v) return null;
        const part = v.includes('T') ? v.split('T')[0] : v;
        const m = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const formatted = m ? `${m[3]}/${m[2]}/${m[1]}` : new Date(v).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        return `Batismo: até ${formatted}`;
      }
      case 'admissionDateFrom': {
        const format = (v: string) => {
          if (!v) return '';
          if (v.includes('/')) return v;
          const part = v.includes('T') ? v.split('T')[0] : v;
          const m = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (m) return `${m[3]}/${m[2]}/${m[1]}`;
          const d = new Date(v);
          return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        };
        return filters.admissionDateTo
          ? `Recebimento: ${format(value)} - ${format(filters.admissionDateTo)}`
          : `Recebimento: de ${format(value)}`;
      }
      case 'admissionDateTo': {
        if (filters.admissionDateFrom) return null;
        const v = value;
        if (!v) return null;
        const part = v.includes('T') ? v.split('T')[0] : v;
        const m = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const formatted = m ? `${m[3]}/${m[2]}/${m[1]}` : new Date(v).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        return `Recebimento: até ${formatted}`;
      }
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
    <div className="flex flex-wrap items-center gap-2">
      {activeFilters.map(([key, value]) => {
        const label = getFilterLabel(key as keyof MemberFilters, value);
        if (!label) return null;

        return (
          <span
            key={key}
            className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded-full bg-gray-200 text-gray-700"
          >
            <span>{label}</span>
            <button
              type="button"
              onClick={() => onRemoveFilter(key as keyof MemberFilters)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={14} />
            </button>
          </span>
        );
      })}

      {hasActiveSorting && sortingLabel && onRemoveSorting && (
        <span className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded-full bg-gray-200 text-gray-700">
          <span>Ordenar por: {sortingLabel}</span>
          <button
            type="button"
            onClick={onRemoveSorting}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        </span>
      )}

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-primary transition-colors"
      >
        <RefreshCcw size={14} />
        Limpar filtros
      </button>
    </div>
  );
} 
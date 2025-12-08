'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { MemberFilters } from '@/app/(main)/members/page';

interface Member {
  id: string;
  name: string;
  birth: string;
  active: boolean;
  role?: { 
    id: string;
    name: string; 
    description?: string;
  } | null;
  congregation?: { 
    id: string;
    name: string; 
    address: string;
    city: string;
    state: string;
    leader?: string;
    phone?: string;
  } | null;
  congregation_id?: string | null;
  gender: string;
  marital_status: string;
  nationality?: string;
  document?: string;
  spouse?: string;
  address?: string;
  complement?: string;
  cep?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  baptism_date?: string;
  role_id?: string;
  occupation?: string;
  admission?: string;
  admission_date?: string;
  father_name?: string;
  mother_name?: string;
  children?: Array<{
    id?: string;
    name: string;
    birth?: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

interface MembersContextType {
  members: Member[];
  pagination: PaginationInfo | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  currentFilters: MemberFilters;
  currentSorting: { sort_by: string; sort_order: 'asc' | 'desc' };
  
  // Funções para carregar dados
  loadMembers: (filters: MemberFilters, sorting: { sort_by: string; sort_order: 'asc' | 'desc' }, page: number) => Promise<void>;
  
  // Funções para atualização otimista
  addMemberOptimistic: (member: Member) => void;
  updateMemberOptimistic: (id: string, updates: Partial<Member>) => void;
  removeMemberOptimistic: (id: string) => void;
  
  // Funções para sincronizar com o servidor
  syncWithServer: () => Promise<void>;
  
  // Funções para gerenciar estado
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPage: (page: number) => void;
}

const MembersContext = createContext<MembersContextType | undefined>(undefined);

export function MembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilters, setCurrentFilters] = useState<MemberFilters>({
    search: '',
    status: 'active',
    roleId: '',
    congregationId: '',
    gender: '',
    maritalStatus: '',
    nationality: '',
    state: '',
    city: '',
    neighborhood: '',
    ageFrom: '',
    ageTo: '',
    occupation: '',
    birthDateFrom: '',
    birthDateTo: '',
    baptismDateFrom: '',
    baptismDateTo: '',
    admissionDateFrom: '',
    admissionDateTo: '',
  });
  const [currentSorting, setCurrentSorting] = useState<{ sort_by: string; sort_order: 'asc' | 'desc' }>({
    sort_by: 'name',
    sort_order: 'asc'
  });

  // Função para carregar membros do servidor
  const loadMembers = useCallback(async (
    filters: MemberFilters, 
    sorting: { sort_by: string; sort_order: 'asc' | 'desc' }, 
    page: number
  ) => {
    setLoading(true);
    setError(null);
    setCurrentFilters(filters);
    setCurrentSorting(sorting);
    setCurrentPage(page);

    try {
      // Importar dinamicamente para evitar problemas de SSR
      const apiService = (await import('@/services/api')).default;
      
      const params = {
        ...filtersToApiParams(filters, sorting),
        page,
        limit: 10
      };

      const response = await apiService.listMembers(params);
      setMembers(response.data);
      setPagination(response.pagination);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro ao carregar membros: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para adicionar membro otimisticamente
  const addMemberOptimistic = useCallback((member: Member) => {
    setMembers(prev => {
      // Adicionar no início da lista se estiver na primeira página
      if (currentPage === 1) {
        return [member, ...prev];
      }
      return prev;
    });

    // Atualizar total se estiver na primeira página
    if (currentPage === 1 && pagination) {
      setPagination(prev => prev ? {
        ...prev,
        total: prev.total + 1
      } : null);
    }
  }, [currentPage, pagination]);

  // Função para atualizar membro otimisticamente
  const updateMemberOptimistic = useCallback((id: string, updates: Partial<Member>) => {
    setMembers(prev => 
      prev.map(member => 
        member.id === id ? { ...member, ...updates } : member
      )
    );
  }, []);

  // Função para remover membro otimisticamente
  const removeMemberOptimistic = useCallback((id: string) => {
    setMembers(prev => prev.filter(member => member.id !== id));
    
    // Atualizar total
    if (pagination) {
      setPagination(prev => prev ? {
        ...prev,
        total: Math.max(0, prev.total - 1)
      } : null);
    }
  }, [pagination]);

  // Função para sincronizar com o servidor
  const syncWithServer = useCallback(async () => {
    await loadMembers(currentFilters, currentSorting, currentPage);
  }, [loadMembers, currentFilters, currentSorting, currentPage]);

  const value: MembersContextType = {
    members,
    pagination,
    loading,
    error,
    currentPage,
    currentFilters,
    currentSorting,
    loadMembers,
    addMemberOptimistic,
    updateMemberOptimistic,
    removeMemberOptimistic,
    syncWithServer,
    setLoading,
    setError,
    setPage: setCurrentPage
  };

  return (
    <MembersContext.Provider value={value}>
      {children}
    </MembersContext.Provider>
  );
}

export function useMembers() {
  const context = useContext(MembersContext);
  if (context === undefined) {
    throw new Error('useMembers deve ser usado dentro de um MembersProvider');
  }
  return context;
}

// Função auxiliar para converter filtros em parâmetros da API
function filtersToApiParams(filters: MemberFilters, sorting?: { sort_by: string; sort_order: 'asc' | 'desc' }) {
  const params: Record<string, string | number | boolean | null | undefined> = {};
  
  if (filters.search && filters.search.trim()) params.search = filters.search.trim();
  if (filters.status === 'active') params.active = true;
  if (filters.status === 'inactive') params.active = false;
  if (filters.roleId && filters.roleId.trim()) params.role_id = filters.roleId.trim();
  if (filters.congregationId && filters.congregationId.trim()) params.congregation_id = filters.congregationId.trim();
  if (filters.gender && filters.gender.trim()) params.gender = filters.gender.trim();
  if (filters.maritalStatus && filters.maritalStatus.trim()) params.marital_status = filters.maritalStatus.trim();
  if (filters.nationality && filters.nationality.trim()) params.nationality = filters.nationality.trim();
  if (filters.state && filters.state.trim()) params.state = filters.state.trim();
  if (filters.city && filters.city.trim()) params.city = filters.city.trim();
  if (filters.neighborhood && filters.neighborhood.trim()) params.neighborhood = filters.neighborhood.trim();
  if (filters.ageFrom && filters.ageFrom.trim()) params.age_from = parseInt(filters.ageFrom);
  if (filters.ageTo && filters.ageTo.trim()) params.age_to = parseInt(filters.ageTo);
  if (filters.occupation && filters.occupation.trim()) params.occupation = filters.occupation.trim();
  if (filters.birthDateFrom && filters.birthDateFrom.trim()) params.birth_date_from = filters.birthDateFrom.trim();
  if (filters.birthDateTo && filters.birthDateTo.trim()) params.birth_date_to = filters.birthDateTo.trim();
  if (filters.baptismDateFrom && filters.baptismDateFrom.trim()) params.baptism_date_from = filters.baptismDateFrom.trim();
  if (filters.baptismDateTo && filters.baptismDateTo.trim()) params.baptism_date_to = filters.baptismDateTo.trim();
  if (filters.admissionDateFrom && filters.admissionDateFrom.trim()) params.admission_date_from = filters.admissionDateFrom.trim();
  if (filters.admissionDateTo && filters.admissionDateTo.trim()) params.admission_date_to = filters.admissionDateTo.trim();
  
  if (sorting) {
    params.sort_by = sorting.sort_by;
    params.sort_order = sorting.sort_order;
  }
  
  return params;
} 
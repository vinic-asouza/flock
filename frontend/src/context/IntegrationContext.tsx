'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import apiService, { formatApiError } from '@/services/api';
import { IntegrationMember, IntegrationFilters } from '@/types';

export interface IntegrationPaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

interface IntegrationContextType {
  integrationMembers: IntegrationMember[];
  pagination: IntegrationPaginationInfo | null;
  loading: boolean;
  error: string | null;
  currentFilters: IntegrationFilters;
  loadIntegrationMembers: (filters: IntegrationFilters, page: number) => Promise<void>;
  addIntegrationMemberOptimistic: (member: IntegrationMember) => void;
  updateIntegrationMemberOptimistic: (id: string, updates: Partial<IntegrationMember>) => void;
  removeIntegrationMemberOptimistic: (id: string) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

const defaultFilters: IntegrationFilters = {
  search: '',
  status: 'todos',
  expectedCongregationId: '',
  mentorId: '',
  sort_by: 'created_at',
  sort_order: 'desc',
};

const IntegrationContext = createContext<IntegrationContextType | undefined>(undefined);

export function IntegrationProvider({ children }: { children: ReactNode }) {
  const [integrationMembers, setIntegrationMembers] = useState<IntegrationMember[]>([]);
  const [pagination, setPagination] = useState<IntegrationPaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<IntegrationFilters>(defaultFilters);
  // Contador monotônico para ignorar respostas de requisições desatualizadas
  const requestIdRef = useRef(0);

  const mapFiltersToParams = (filters: IntegrationFilters) => {
    const params: Record<string, string | undefined> = {
      search: filters.search?.trim() || undefined,
      status: filters.status !== 'todos' ? filters.status : undefined,
      expected_congregation_id: filters.expectedCongregationId?.trim() || undefined,
      mentor_id: filters.mentorId?.trim() || undefined,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
    };

    return params;
  };

  const loadIntegrationMembers = useCallback(async (filters: IntegrationFilters, page: number) => {
    const reqId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setCurrentFilters(filters);

    try {
      const params = mapFiltersToParams(filters);
      const response = await apiService.listIntegrationMembers({
        ...params,
        page,
        limit: 10,
      });

      // Descartar resposta se uma requisição mais recente já foi disparada
      if (reqId !== requestIdRef.current) return;

      setIntegrationMembers(response.data);
      setPagination(response.pagination);
    } catch (err: unknown) {
      if (reqId !== requestIdRef.current) return;
      const errorMessage = formatApiError(err);
      setError(errorMessage);
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const addIntegrationMemberOptimistic = useCallback((member: IntegrationMember) => {
    setIntegrationMembers(prev => [member, ...prev]);
    setPagination(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        total: prev.total + 1,
      };
    });
  }, []);

  const updateIntegrationMemberOptimistic = useCallback((id: string, updates: Partial<IntegrationMember>) => {
    setIntegrationMembers(prev =>
      prev.map(member => (member.id === id ? { ...member, ...updates } : member))
    );
  }, []);

  const removeIntegrationMemberOptimistic = useCallback((id: string) => {
    setIntegrationMembers(prev => prev.filter(member => member.id !== id));
    setPagination(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        total: Math.max(0, prev.total - 1),
      };
    });
  }, []);

  const value: IntegrationContextType = {
    integrationMembers,
    pagination,
    loading,
    error,
    currentFilters,
    loadIntegrationMembers,
    addIntegrationMemberOptimistic,
    updateIntegrationMemberOptimistic,
    removeIntegrationMemberOptimistic,
    setError,
    setLoading,
  };

  return (
    <IntegrationContext.Provider value={value}>
      {children}
    </IntegrationContext.Provider>
  );
}

export function useIntegration() {
  const context = useContext(IntegrationContext);
  if (context === undefined) {
    throw new Error('useIntegration deve ser usado dentro de um IntegrationProvider');
  }
  return context;
}


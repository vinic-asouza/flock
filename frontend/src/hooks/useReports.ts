'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { MemberReports, ReportFilters } from '@/types';

export function useReports() {
  const [data, setData] = useState<MemberReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadReports = useCallback(async (customFilters?: ReportFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const reportsData = await apiService.getMemberReports(customFilters || filters);
      setData(reportsData);
      setLastUpdated(new Date().toLocaleString('pt-BR'));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar relatórios';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const applyFilters = useCallback((newFilters: ReportFilters) => {
    setFilters(newFilters);
    loadReports(newFilters);
  }, [loadReports]);

  const clearFilters = useCallback(() => {
    setFilters({});
    loadReports({});
  }, [loadReports]);

  const refresh = useCallback(() => {
    loadReports();
  }, [loadReports]);

  // Carregar dados iniciais
  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    data,
    loading,
    error,
    filters,
    lastUpdated,
    loadReports,
    applyFilters,
    clearFilters,
    refresh,
  };
}

import { useCallback, useEffect, useState } from 'react';
import apiService from '@/services/api';
import { Congregation } from '@/types/congregation';

export function useFiltersData() {
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const congregationsData = await apiService.listCongregations();

      setCongregations(congregationsData);
    } catch {
      setCongregations([]);
      setError('Erro ao carregar dados dos filtros');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    congregations,
    loading,
    error,
    reload: loadData,
  };
}

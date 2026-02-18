import { useState, useEffect } from 'react';
import apiService from '@/services/api';
import { Congregation } from '@/types/congregation';

export function useFiltersData() {
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Carregar apenas congregações
        const congregationsData = await apiService.listCongregations();

        setCongregations(congregationsData);
      } catch {
        setError('Erro ao carregar dados dos filtros');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return {
    congregations,
    loading,
    error
  };
} 
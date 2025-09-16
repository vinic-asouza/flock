import { useState, useEffect } from 'react';
import apiService from '@/services/api';
import { Role } from '@/types/role';
import { Congregation } from '@/types/congregation';

export function useFiltersData() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Carregar cargos e congregações em paralelo
        const [rolesData, congregationsData] = await Promise.all([
          apiService.listRoles(),
          apiService.listCongregations()
        ]);

        setRoles(rolesData);
        setCongregations(congregationsData);
      } catch (err) {
        console.error('❌ Erro ao carregar dados dos filtros:', err);
        setError('Erro ao carregar dados dos filtros');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return {
    roles,
    congregations,
    loading,
    error
  };
} 
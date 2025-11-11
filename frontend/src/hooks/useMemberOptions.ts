import { useEffect, useState, useCallback, useRef } from 'react';
import apiService from '@/services/api';

export interface MemberOption {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  active: boolean;
}

export function useMemberOptions({
  initialSearch = '',
  includeInactive = false,
  enabled = true,
}: {
  initialSearch?: string;
  includeInactive?: boolean;
  enabled?: boolean;
} = {}) {
  const [options, setOptions] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const abortRef = useRef<AbortController | null>(null);

  const fetchMembers = useCallback(async (searchValue: string) => {
    if (!enabled) {
      setOptions([]);
      return;
    }

    try {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      const response = await apiService.listMembers({
        page: 1,
        limit: 20,
        search: searchValue,
        active: includeInactive ? undefined : true,
        sort_by: 'name',
        sort_order: 'asc',
      });

      const mappedOptions = response.data.map((member: any) => ({
        id: member.id,
        name: member.name,
        phone: member.phone ?? null,
        whatsapp: member.whatsapp ?? null,
        active: member.active,
      }));

      setOptions(mappedOptions);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Erro ao carregar membros para seleção:', err);
      setError(err.message || 'Erro ao carregar membros');
    } finally {
      setLoading(false);
    }
  }, [includeInactive, enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchMembers(search);
  }, [fetchMembers, search, enabled]);

  return {
    options,
    loading,
    error,
    search,
    setSearch,
    refresh: fetchMembers,
  };
}


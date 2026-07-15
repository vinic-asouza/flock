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
  congregationId,
}: {
  initialSearch?: string;
  includeInactive?: boolean;
  enabled?: boolean;
  congregationId?: string | null;
} = {}) {
  const [options, setOptions] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const requestIdRef = useRef(0);

  const fetchMembers = useCallback(async (searchValue: string) => {
    const requestId = ++requestIdRef.current;
    if (!enabled) {
      setOptions([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.listMembers({
        page: 1,
        limit: 20,
        search: searchValue,
        active: includeInactive ? undefined : true,
        congregation_id: congregationId || undefined,
        sort_by: 'name',
        sort_order: 'asc',
      });

      const mappedOptions = response.data.map((member: { id: string; name: string; phone?: string | null; whatsapp?: string | null; active: boolean }) => ({
        id: member.id,
        name: member.name,
        phone: member.phone ?? null,
        whatsapp: member.whatsapp ?? null,
        active: member.active,
      }));

      if (requestId !== requestIdRef.current) {
        return;
      }

      setOptions(mappedOptions);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar membros';
      setError(errorMessage);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [includeInactive, enabled, congregationId]);

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


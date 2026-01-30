import { useState, useCallback } from 'react';
import { Church } from '@/types';
import apiService from '@/services/api';

interface UseChurchReturn {
  church: Church | null;
  isLoading: boolean;
  error: string | null;
  updateChurch: (data: Partial<Church>) => Promise<Church>;
  refreshChurch: () => Promise<void>;
}

export function useChurch(): UseChurchReturn {
  const [church, setChurch] = useState<Church | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshChurch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const churchData = await apiService.getChurchData();
      setChurch(churchData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados da igreja';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateChurch = useCallback(async (data: Partial<Church>): Promise<Church> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedChurch = await apiService.updateChurch(data);
      setChurch(updatedChurch);
      
      return updatedChurch;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar dados da igreja';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    church,
    isLoading,
    error,
    updateChurch,
    refreshChurch
  };
}

'use client';

import { useState, useCallback } from 'react';
import { apiService } from '@/services/api';
import { ValidationResult, ImportResult } from '@/types';

export function useMemberImport() {
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateImport = useCallback(async (file: File, congregationId: string | null = null) => {
    try {
      setValidating(true);
      setError(null);
      setValidationResult(null);

      const result = await apiService.validateMemberImport(file, congregationId);
      setValidationResult(result);
      return result;
    } catch (err: unknown) {
      let errorMessage = 'Erro ao validar arquivo CSV';
      
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string; details?: string | string[] }; status?: number }; message?: string };
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.response?.data?.details) {
          errorMessage = Array.isArray(axiosError.response.data.details) 
            ? axiosError.response.data.details.join(', ')
            : axiosError.response.data.details;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
        
        // Se for erro de limite, mostrar mensagem específica
        if (errorMessage.toLowerCase().includes('limite') || axiosError.response?.status === 403) {
          errorMessage = 'Limite de membros atingido. A quantidade de membros no arquivo CSV ultrapassa o limite do seu plano atual.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setValidating(false);
    }
  }, []);

  const importMembers = useCallback(async (
    file: File,
    congregationId: string | null = null,
    skipDuplicates: boolean = true
  ) => {
    try {
      setImporting(true);
      setError(null);
      setImportResult(null);

      const result = await apiService.importMembers(file, congregationId, skipDuplicates);
      setImportResult(result);
      return result;
    } catch (err: unknown) {
      let errorMessage = 'Erro ao importar membros';
      
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string; details?: string | string[] }; status?: number }; message?: string };
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.response?.data?.details) {
          errorMessage = Array.isArray(axiosError.response.data.details) 
            ? axiosError.response.data.details.join(', ')
            : axiosError.response.data.details;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
        
        // Se for erro de limite, mostrar mensagem específica
        if (errorMessage.toLowerCase().includes('limite') || axiosError.response?.status === 403) {
          errorMessage = 'Limite de membros atingido. A quantidade de membros no arquivo CSV ultrapassa o limite do seu plano atual.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setImporting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setValidationResult(null);
    setImportResult(null);
    setError(null);
  }, []);

  return {
    validating,
    importing,
    validationResult,
    importResult,
    error,
    setError,
    validateImport,
    importMembers,
    reset,
  };
}


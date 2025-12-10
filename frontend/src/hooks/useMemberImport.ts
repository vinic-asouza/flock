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
    } catch (err: any) {
      let errorMessage = 'Erro ao validar arquivo CSV';
      
      if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.response?.data?.details) {
        errorMessage = Array.isArray(err.response.data.details) 
          ? err.response.data.details.join(', ')
          : err.response.data.details;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      // Se for erro de limite, mostrar mensagem específica
      if (errorMessage.toLowerCase().includes('limite') || err?.response?.status === 403) {
        errorMessage = 'Limite de membros atingido. A quantidade de membros no arquivo CSV ultrapassa o limite do seu plano atual.';
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
    } catch (err: any) {
      let errorMessage = 'Erro ao importar membros';
      
      if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.response?.data?.details) {
        errorMessage = Array.isArray(err.response.data.details) 
          ? err.response.data.details.join(', ')
          : err.response.data.details;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      // Se for erro de limite, mostrar mensagem específica
      if (errorMessage.toLowerCase().includes('limite') || err?.response?.status === 403) {
        errorMessage = 'Limite de membros atingido. A quantidade de membros no arquivo CSV ultrapassa o limite do seu plano atual.';
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


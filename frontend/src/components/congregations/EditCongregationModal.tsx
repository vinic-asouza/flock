'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { CongregationForm } from './CongregationForm';
import { LoaderCircle } from 'lucide-react';
import apiService from '@/services/api';

interface Congregation {
  id: string;
  church_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  leader?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

interface EditCongregationModalProps {
  isOpen: boolean;
  onClose: () => void;
  congregationId: string;
  onSuccess: (congregationData: { id: string; [key: string]: unknown }) => void;
}

export function EditCongregationModal({ isOpen, onClose, congregationId, onSuccess }: EditCongregationModalProps) {
  const [congregation, setCongregation] = useState<Congregation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCongregation, setIsLoadingCongregation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados da congregação quando modal abrir
  useEffect(() => {
    if (isOpen && congregationId) {
      loadCongregation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, congregationId]);

  const loadCongregation = async () => {
    try {
      setIsLoadingCongregation(true);
      setError(null);
      const data = await apiService.getCongregation(congregationId);
      setCongregation(data);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { error?: string; details?: string } } };
      const errorMessage = errorResponse.response?.data?.details 
        || errorResponse.response?.data?.error 
        || (err instanceof Error ? err.message : 'Erro ao carregar dados da congregação');
      setError(errorMessage);
    } finally {
      setIsLoadingCongregation(false);
    }
  };

  const handleSubmit = async (data: { name: string; [key: string]: unknown }) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await apiService.updateCongregation(congregationId, data);
      
      // Buscar os dados atualizados da congregação para garantir que temos todos os dados
      const updatedCongregation = await apiService.getCongregation(congregationId);
      
      // Passar os dados da congregação atualizada com a estrutura completa
      onSuccess(updatedCongregation);
      onClose();
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { error?: string; details?: string } } };
      const errorMessage = errorResponse.response?.data?.details 
        || errorResponse.response?.data?.error 
        || (err instanceof Error ? err.message : 'Erro ao atualizar congregação');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !isLoadingCongregation) {
      setCongregation(null);
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Congregação"
      size="xl"
      closeOnOverlayClick={!isLoading && !isLoadingCongregation}
      closeOnEscape={!isLoading && !isLoadingCongregation}
    >
      {isLoadingCongregation && (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="animate-spin text-primary" size={32} />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mx-6 mt-6">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      )}

      {congregation && !isLoadingCongregation && (
        <CongregationForm
          congregation={congregation}
          mode="edit"
          onSubmit={handleSubmit}
          onCancel={handleClose}
          isLoading={isLoading}
        />
      )}
    </Modal>
  );
}

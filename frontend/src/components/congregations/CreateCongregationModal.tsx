'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { CongregationForm } from './CongregationForm';
import { apiService } from '@/services/api';

interface CreateCongregationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (congregationData: { id: string; [key: string]: unknown }) => void;
}

export function CreateCongregationModal({ isOpen, onClose, onSuccess }: CreateCongregationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: { name: string; address: string; city: string; state: string; leader?: string; phone?: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.createCongregation(data);
      onSuccess(response);
      onClose();
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { error?: string; details?: string } } };
      const errorMessage = errorResponse.response?.data?.details 
        || errorResponse.response?.data?.error 
        || (err instanceof Error ? err.message : 'Erro ao criar congregação');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nova Congregação"
      size="xl"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mx-6 mt-6">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      )}

      <CongregationForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleClose}
        isLoading={isLoading}
      />
    </Modal>
  );
}

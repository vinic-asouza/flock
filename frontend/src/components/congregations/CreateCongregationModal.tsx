'use client';

import { useCallback, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CongregationForm } from './CongregationForm';
import { apiService } from '@/services/api';

const FORM_ID = 'create-congregation-form';

interface CreateCongregationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (congregationData: { id: string; [key: string]: unknown }) => void;
}

export function CreateCongregationModal({ isOpen, onClose, onSuccess }: CreateCongregationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitBlocked, setSubmitBlocked] = useState(false);

  const handleSubmitBlockedChange = useCallback((blocked: boolean) => {
    setSubmitBlocked(blocked);
  }, []);

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
      footer={
        <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:p-6">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
            className="min-h-11 w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            isLoading={isLoading}
            disabled={isLoading || submitBlocked}
            className="min-h-11 w-full sm:w-auto"
          >
            Criar Congregação
          </Button>
        </div>
      }
    >
      {error && (
        <div className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 p-4 sm:mx-6 sm:mt-6">
          <p className="break-words text-sm font-medium text-red-600">{error}</p>
        </div>
      )}

      <CongregationForm
        formId={FORM_ID}
        showActions={false}
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleClose}
        isLoading={isLoading}
        onSubmitBlockedChange={handleSubmitBlockedChange}
      />
    </Modal>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CongregationForm } from './CongregationForm';
import { LoaderCircle } from 'lucide-react';
import apiService, { formatApiError } from '@/services/api';

const FORM_ID = 'edit-congregation-form';

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
  const [submitBlocked, setSubmitBlocked] = useState(false);

  const handleSubmitBlockedChange = useCallback((blocked: boolean) => {
    setSubmitBlocked(blocked);
  }, []);

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
      setError(formatApiError(err));
    } finally {
      setIsLoadingCongregation(false);
    }
  };

  const handleSubmit = async (data: { name: string; [key: string]: unknown }) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedCongregation = await apiService.updateCongregation(congregationId, data);
      onSuccess(updatedCongregation);
      onClose();
    } catch (err: unknown) {
      setError(formatApiError(err));
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

  const showFormFooter = Boolean(congregation && !isLoadingCongregation);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Congregação"
      size="xl"
      closeOnOverlayClick={!isLoading && !isLoadingCongregation}
      closeOnEscape={!isLoading && !isLoadingCongregation}
      footer={
        showFormFooter ? (
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
              Salvar Alterações
            </Button>
          </div>
        ) : undefined
      }
    >
      {isLoadingCongregation && (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="animate-spin text-primary" size={32} />
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 p-4 sm:mx-6 sm:mt-6">
          <p className="break-words text-sm font-medium text-red-600">{error}</p>
        </div>
      )}

      {congregation && !isLoadingCongregation && (
        <CongregationForm
          formId={FORM_ID}
          showActions={false}
          congregation={congregation}
          mode="edit"
          onSubmit={handleSubmit}
          onCancel={handleClose}
          isLoading={isLoading}
          onSubmitBlockedChange={handleSubmitBlockedChange}
        />
      )}
    </Modal>
  );
}

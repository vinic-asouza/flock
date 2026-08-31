'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { IntegrationForm } from './IntegrationForm';
import apiService, { formatApiError } from '@/services/api';
import { IntegrationMember, IntegrationMemberPayload } from '@/types';

const FORM_ID = 'edit-integration-form';

interface EditIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  member?: IntegrationMember | null;
  onSuccess: (member: IntegrationMember) => void;
}

export function EditIntegrationModal({
  isOpen,
  onClose,
  member,
  onSuccess
}: EditIntegrationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (payload: IntegrationMemberPayload) => {
    if (!member) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.updateIntegrationMember(member.id, payload);
      onSuccess(response);
      onClose();
    } catch (err: unknown) {
      const errorMessage = formatApiError(err);
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
      title="Editar integrante"
      size="xl"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      footer={
        member ? (
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
              disabled={isLoading}
              className="min-h-11 w-full sm:w-auto"
            >
              Salvar alterações
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col min-h-0 p-4 sm:p-6 space-y-4">
        {error && (
          <div className="flex-shrink-0 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-600 break-words">{error}</p>
          </div>
        )}

        <div className="flex-1 min-h-0">
          <IntegrationForm
            formId={FORM_ID}
            showActions={false}
            mode="edit"
            initialData={member}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isLoading={isLoading}
          />
        </div>
      </div>
    </Modal>
  );
}

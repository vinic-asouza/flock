'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { IntegrationForm } from './IntegrationForm';
import apiService from '@/services/api';
import { IntegrationMember, IntegrationMemberPayload } from '@/types';

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
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar integrante';
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
      size="lg"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="flex flex-col min-h-[70vh] p-6 space-y-4">
        {error && (
          <div className="flex-shrink-0 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        <div className="flex-1">
          <IntegrationForm
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


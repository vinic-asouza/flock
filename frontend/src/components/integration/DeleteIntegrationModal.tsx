'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import apiService from '@/services/api';

interface DeleteIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId?: string;
  memberName?: string;
  onSuccess: () => void;
  title?: string;
  message?: string;
  buttonLabel?: string;
  errorMessage?: string;
}

export function DeleteIntegrationModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  onSuccess,
  title = 'Descartar integrante',
  message,
  buttonLabel = 'Descartar integrante',
  errorMessage = 'Erro ao descartar integrante'
}: DeleteIntegrationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!memberId) return;

    try {
      setIsLoading(true);
      setError(null);

      await apiService.deleteIntegrationMember(memberId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const defaultMessage = message || `Tem certeza de que deseja descartar o integrante ${memberName ? `"${memberName}"` : ''}? Essa ação não poderá ser desfeita.`;

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
      title={title}
      size="md"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        <p className="text-sm text-gray-600">
          {defaultMessage}
        </p>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete} disabled={isLoading} isLoading={isLoading}>
            {buttonLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}


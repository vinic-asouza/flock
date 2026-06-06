'use client';

import { useState } from 'react';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import apiService, { formatApiError } from '@/services/api';

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
  errorMessage: defaultErrorMessage = 'Erro ao descartar integrante'
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
    } catch (err: unknown) {
      const errorMsg = formatApiError(err) || defaultErrorMessage;
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const defaultMessage = message || `Tem certeza de que deseja descartar o integrante ${memberName ? `"${memberName}"` : ''}? Essa ação não poderá ser desfeita.`;

  return (
    <ConfirmDeleteModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDelete}
      title={title}
      message={defaultMessage}
      isLoading={isLoading}
      error={error}
      variant="danger"
      confirmLabel={buttonLabel}
      cancelLabel="Cancelar"
      showIcon={true}
      size="md"
    />
  );
}


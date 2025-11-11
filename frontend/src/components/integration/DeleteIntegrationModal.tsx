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
}

export function DeleteIntegrationModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  onSuccess
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
      setError(err.message || 'Erro ao descartar integrante');
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
      title="Descartar integrante"
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
          Tem certeza de que deseja descartar o integrante{' '}
          <span className="font-semibold text-gray-900">{memberName}</span>? Essa ação não poderá ser desfeita.
        </p>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete} disabled={isLoading} isLoading={isLoading}>
            Descartar integrante
          </Button>
        </div>
      </div>
    </Modal>
  );
}


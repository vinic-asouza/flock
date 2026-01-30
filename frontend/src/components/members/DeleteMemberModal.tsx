'use client';

import { useState } from 'react';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import apiService from '@/services/api';

interface DeleteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  onSuccess: (memberId: string) => void;
}

export function DeleteMemberModal({ isOpen, onClose, memberId, memberName, onSuccess }: DeleteMemberModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await apiService.deleteMember(memberId);
      
      onSuccess(memberId);
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir membro';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ConfirmDeleteModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDelete}
      title="Confirmar Exclusão"
      message={`Tem certeza que deseja excluir o membro ${memberName}? Esta ação não pode ser desfeita.`}
      itemName="Membro"
      isLoading={isLoading}
      error={error}
      variant="danger"
      confirmLabel="Excluir"
      cancelLabel="Cancelar"
    />
  );
} 
'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';
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
      title="Confirmar Exclusão"
      size="sm"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="flex flex-col">
        <div className="p-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          )}

          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Excluir Membro
            </h3>
            
            <p className="text-sm text-gray-500 mb-6">
              Tem certeza que deseja excluir o membro <strong>{memberName}</strong>? 
              Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-6">
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isLoading}
            >
              Excluir
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
} 
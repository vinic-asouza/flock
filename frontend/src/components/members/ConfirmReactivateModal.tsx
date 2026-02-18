'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { UserPlus, Loader } from 'lucide-react';

interface ConfirmReactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function ConfirmReactivateModal({ 
  isOpen, 
  onClose, 
  memberName, 
  onConfirm,
  isLoading = false 
}: ConfirmReactivateModalProps) {
  const [isReactivating, setIsReactivating] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsReactivating(true);
      await onConfirm();
      onClose();
    } catch {
      // Erro já tratado pelo toast
    } finally {
      setIsReactivating(false);
    }
  };

  const handleClose = () => {
    if (!isReactivating && !isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Confirmar Reativação"
      size="sm"
      closeOnOverlayClick={!isReactivating && !isLoading}
      closeOnEscape={!isReactivating && !isLoading}
    >
      <div className="flex flex-col">
        <div className="p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <UserPlus className="h-6 w-6 text-green-600" />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Reativar Membro
            </h3>
            
            <p className="text-sm text-gray-500 mb-6">
              Tem certeza que deseja reativar o membro <strong>{memberName}</strong>? 
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 p-6">
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isReactivating || isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isReactivating || isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {(isReactivating || isLoading) ? (
                <>
                  <Loader size={16} className="mr-2 animate-spin" />
                  Reativando...
                </>
              ) : (
                <>
                  <UserPlus size={16} className="mr-2" />
                  Reativar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

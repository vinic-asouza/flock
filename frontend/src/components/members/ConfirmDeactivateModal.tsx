'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { UserMinus, Loader } from 'lucide-react';

interface ConfirmDeactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function ConfirmDeactivateModal({ 
  isOpen, 
  onClose, 
  memberName, 
  onConfirm,
  isLoading = false 
}: ConfirmDeactivateModalProps) {
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeactivating(true);
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Erro ao confirmar inativação:', error);
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleClose = () => {
    if (!isDeactivating && !isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Confirmar Inativação"
      size="sm"
      closeOnOverlayClick={!isDeactivating && !isLoading}
      closeOnEscape={!isDeactivating && !isLoading}
    >
      <div className="flex flex-col">
        <div className="p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
              <UserMinus className="h-6 w-6 text-orange-600" />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Inativar Membro
            </h3>
            
            <p className="text-sm text-gray-500 mb-6">
              Tem certeza que deseja inativar o membro <strong>{memberName}</strong>? 
              <br />
              <span className="text-orange-600 font-medium">
                O membro ficará marcado como inativo, mas poderá ser reativado posteriormente.
              </span>
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 p-6">
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isDeactivating || isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isDeactivating || isLoading}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {(isDeactivating || isLoading) ? (
                <>
                  <Loader size={16} className="mr-2 animate-spin" />
                  Inativando...
                </>
              ) : (
                <>
                  <UserMinus size={16} className="mr-2" />
                  Inativar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

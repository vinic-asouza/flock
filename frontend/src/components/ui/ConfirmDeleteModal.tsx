'use client';

import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message: string;
  itemName?: string;
  isLoading?: boolean;
  error?: string | null;
  variant?: 'danger' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Componente ConfirmDeleteModal genérico para confirmações de exclusão
 * Padroniza modais de exclusão que tinham estruturas diferentes
 */
export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar Exclusão',
  message,
  itemName,
  isLoading = false,
  error,
  variant = 'danger',
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  showIcon = true,
  size = 'sm',
}: ConfirmDeleteModalProps) {
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const iconColor = variant === 'danger' ? 'text-red-600' : 'text-orange-600';
  const iconBg = variant === 'danger' ? 'bg-red-100' : 'bg-orange-100';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size={size}
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
            {showIcon && (
              <div className={clsx('mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4', iconBg)}>
                <AlertTriangle className={clsx('h-6 w-6', iconColor)} />
              </div>
            )}

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {itemName ? `Excluir ${itemName}` : title}
            </h3>

            <p className="text-sm text-gray-500 mb-6">
              {message}
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
              {cancelLabel}
            </Button>
            <Button
              variant="danger"
              onClick={onConfirm}
              isLoading={isLoading}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

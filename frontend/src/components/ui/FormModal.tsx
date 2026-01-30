'use client';

import React from 'react';
import { Modal } from './Modal';
import { Alert } from './Alert';
import { clsx } from 'clsx';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  error?: string | null;
  isLoading?: boolean;
  children: React.ReactNode;
  minHeight?: string;
  showErrorAtTop?: boolean;
}

/**
 * Componente FormModal wrapper para padronizar modais de formulário
 * Padroniza estrutura: error no topo, form no body
 */
export function FormModal({
  isOpen,
  onClose,
  title,
  size = 'xl',
  error,
  isLoading = false,
  children,
  minHeight = '70vh',
  showErrorAtTop = true,
}: FormModalProps) {
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size={size}
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="flex flex-col" style={{ minHeight }}>
        {showErrorAtTop && error && (
          <div className="flex-shrink-0 px-6 pt-6">
            <Alert variant="error" message={error} />
          </div>
        )}

        <div className="flex-1 p-6">
          {!showErrorAtTop && error && (
            <div className="mb-4">
              <Alert variant="error" message={error} />
            </div>
          )}
          {children}
        </div>
      </div>
    </Modal>
  );
}

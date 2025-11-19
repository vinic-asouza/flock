'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { RoleForm } from './RoleForm';
import { apiService } from '@/services/api';

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (roleData: { id: string; [key: string]: unknown }) => void;
}

export function CreateRoleModal({ isOpen, onClose, onSuccess }: CreateRoleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: { name: string; [key: string]: unknown }) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.createRole(data);
      
      onSuccess(response);
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error 
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || err.message 
        : 'Erro ao criar cargo';
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
      title="Criar Novo Cargo"
      size="lg"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mx-6 mt-6">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      )}
      
      <RoleForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleClose}
        isLoading={isLoading}
      />
    </Modal>
  );
}

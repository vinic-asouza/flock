'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { MemberForm } from './MemberForm';
import apiService from '@/services/api';

interface CreateMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (memberData: any) => void;
}

export function CreateMemberModal({ isOpen, onClose, onSuccess }: CreateMemberModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.createMember(data);
      
      // Passar os dados do membro criado (incluindo o ID retornado pela API)
      onSuccess(response);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar membro');
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
      title="Criar Novo Membro"
      size="xl"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="flex flex-col min-h-[75vh]">
        {error && (
          <div className="flex-shrink-0 p-4 bg-red-50 border border-red-200 rounded-md mx-6 mt-6">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}
        
        <div className="flex-1">
          <MemberForm
            mode="create"
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isLoading={isLoading}
          />
        </div>
      </div>
    </Modal>
  );
} 
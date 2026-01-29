'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { MemberForm } from './MemberForm';
import apiService from '@/services/api';

interface CreateMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (memberData: { id: string; [key: string]: unknown }) => void;
}

export function CreateMemberModal({ isOpen, onClose, onSuccess }: CreateMemberModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: { name: string; groups?: string[]; [key: string]: unknown }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // ✅ TRANSAÇÃO: Backend agora processa membro + grupos atomicamente
      // Enviar dados completos incluindo grupos
      const response = await apiService.createMember(data);
      
      // Passar os dados do membro criado (incluindo o ID retornado pela API)
      onSuccess(response);
      onClose();
      setIsLoading(false);
    } catch (err: unknown) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar membro';
      setError(errorMessage);
      // Re-lançar o erro para que o MemberForm não limpe o formulário
      throw err;
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
        <div className="flex-1">
          <MemberForm
            mode="create"
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </Modal>
  );
} 
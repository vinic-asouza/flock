'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { MemberForm } from './MemberForm';
import { LoaderCircle } from 'lucide-react';
import apiService from '@/services/api';

interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  birth: string;
  gender: string;
  marital_status: string;
  nationality: string;
  document?: string;
  spouse?: string;
  occupation: string;
  address: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cep?: string;
  baptism_date?: string;
  admission?: string;
  admission_date?: string;
  congregation_id?: string;
  active: boolean;
  congregation?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    leader?: string;
    phone?: string;
  } | null;
  groups?: Array<{
    id: string;
    name: string;
    type: string;
    status: boolean;
    congregation_id?: string | null;
    memberGroupId?: string;
    addedAt?: string;
    congregations?: {
      id: string;
      name: string;
    } | null;
  }>;
}

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  onSuccess: (memberData: { id: string; [key: string]: unknown }) => void;
}

export function EditMemberModal({ isOpen, onClose, memberId, onSuccess }: EditMemberModalProps) {
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMember, setIsLoadingMember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados do membro quando modal abrir
  useEffect(() => {
    if (isOpen && memberId) {
      loadMember();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, memberId]);

  const loadMember = async () => {
    try {
      setIsLoadingMember(true);
      setError(null);
      const data = await apiService.getMember(memberId);
      setMember(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados do membro';
      setError(errorMessage);
    } finally {
      setIsLoadingMember(false);
    }
  };

  const handleSubmit = async (data: { name: string; groups?: string[]; [key: string]: unknown }) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // ✅ TRANSAÇÃO: Backend agora processa membro + grupos atomicamente
      // Enviar dados completos incluindo grupos
      await apiService.updateMember(memberId, data);
      
      // Buscar os dados atualizados do membro para garantir que temos todos os dados
      const updatedMember = await apiService.getMember(memberId);
      
      // Passar os dados do membro atualizado com a estrutura completa
      onSuccess(updatedMember);
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar membro';
      setError(errorMessage);
      // Re-lançar o erro para que o MemberForm não limpe o formulário
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !isLoadingMember) {
      setMember(null);
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Membro"
      size="xl"
      closeOnOverlayClick={!isLoading && !isLoadingMember}
      closeOnEscape={!isLoading && !isLoadingMember}
    >
      <div className="flex flex-col min-h-[75vh]">
        {isLoadingMember && (
          <div className="flex items-center justify-center py-12">
            <LoaderCircle className="animate-spin text-primary" size={32} />
          </div>
        )}

        {member && !isLoadingMember && (
          <div className="flex-1">
            <MemberForm
              member={member}
              mode="edit"
              onSubmit={handleSubmit}
              onCancel={handleClose}
              isLoading={isLoading}
              error={error}
            />
          </div>
        )}
      </div>
    </Modal>
  );
} 
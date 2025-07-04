'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { MemberForm } from './MemberForm';
import { Loader } from 'lucide-react';
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
  role_id?: string;
  congregation_id?: string;
  active: boolean;
}

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  onSuccess: (memberData: any) => void;
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
  }, [isOpen, memberId]);

  const loadMember = async () => {
    try {
      setIsLoadingMember(true);
      setError(null);
      const data = await apiService.getMember(memberId);
      setMember(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do membro');
    } finally {
      setIsLoadingMember(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.updateMember(memberId, data);
      
      // Passar os dados do membro atualizado
      onSuccess({ ...response, id: memberId });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar membro');
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
      {isLoadingMember && (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-primary" size={32} />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mx-6 mt-6">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      )}

      {member && !isLoadingMember && (
        <MemberForm
          member={member}
          mode="edit"
          onSubmit={handleSubmit}
          onCancel={handleClose}
          isLoading={isLoading}
        />
      )}
    </Modal>
  );
} 
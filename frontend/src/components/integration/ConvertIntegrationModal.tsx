'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { MemberForm } from '@/components/members/MemberForm';
import apiService, { formatApiError } from '@/services/api';
import { IntegrationMember } from '@/types';

interface ConvertIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrationMember?: IntegrationMember | null;
  onSuccess: (result: { member: unknown; integrationMember: IntegrationMember }) => void;
}

const mapGender = (value?: string | null) => {
  if (!value) return '';
  return value === 'masculino' ? 'Masculino' : value === 'feminino' ? 'Feminino' : '';
};

const mapMaritalStatus = (value?: string | null) => {
  if (!value) return '';
  switch (value) {
    case 'solteiro':
      return 'Solteiro';
    case 'casado':
      return 'Casado';
    case 'divorciado':
      return 'Divorciado';
    case 'viuvo':
      return 'Viúvo';
    case 'outro':
      return 'Outro';
    default:
      return '';
  }
};

const mapAdmission = (value?: string | null) => {
  if (!value) return '';
  switch (value) {
    case 'batismo':
      return 'Batismo';
    case 'transferencia':
      return 'Transferência';
    case 'profissao de fe':
      return 'Profissão de Fé';
    case 'outro':
      return 'Outro';
    default:
      return '';
  }
};

export function ConvertIntegrationModal({
  isOpen,
  onClose,
  integrationMember,
  onSuccess
}: ConvertIntegrationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialMemberData = useMemo(() => {
    if (!integrationMember) return null;

    return {
      id: integrationMember.id,
      name: integrationMember.name,
      email: '',
      phone: integrationMember.phone ?? '',
      whatsapp: integrationMember.whatsapp ?? '',
      birth: integrationMember.birth ?? '',
      gender: mapGender(integrationMember.gender),
      marital_status: mapMaritalStatus(integrationMember.marital_status),
      nationality: '',
      spouse: '',
      occupation: '', // Campo obrigatório no tipo local do MemberForm
      address: '', // Campo obrigatório no tipo local do MemberForm
      complement: '',
      neighborhood: '', // Campo obrigatório no tipo local do MemberForm
      city: '', // Campo obrigatório no tipo local do MemberForm
      state: '', // Campo obrigatório no tipo local do MemberForm
      cep: '',
      baptism_date: '',
      admission: mapAdmission(integrationMember.expected_admission_type),
      admission_date: '',
      congregation_id: integrationMember.expected_congregation_id ?? '',
      active: true,
      congregation: integrationMember.expected_congregation
        ? {
          id: integrationMember.expected_congregation.id,
          name: integrationMember.expected_congregation.name,
          address: '',
          city: integrationMember.expected_congregation.city,
          state: integrationMember.expected_congregation.state,
          leader: undefined,
          phone: undefined
        }
        : null
    } as unknown as Parameters<typeof MemberForm>[0]['member'];
  }, [integrationMember]);

  const handleSubmit = async (formData: { name: string; [key: string]: unknown }) => {
    if (!integrationMember) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await apiService.convertIntegrationMember(integrationMember.id, formData);
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const errorMessage = formatApiError(err);
      setError(errorMessage);
      // Não resetar o formulário - os dados devem permanecer
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
      title="Integrar para membresia"
      size="xl"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="flex flex-col min-h-[75vh] space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {integrationMember && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 text-sm">
              <p className="font-medium">
                Os campos abaixo foram preenchidos com as informações fornecidas durante a integração. Complete os dados obrigatórios para concluir o cadastro.
              </p>
            </div>
          )}

          <MemberForm
            key={integrationMember?.id || 'new'}
            mode="create"
            member={initialMemberData}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isLoading={isLoading}
          />
        </div>
      </div>
    </Modal>
  );
}


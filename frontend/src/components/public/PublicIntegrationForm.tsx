'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useFiltersData } from '@/hooks/useFiltersData';
import {
  IntegrationMemberPayload,
  IntegrationGender,
  IntegrationMaritalStatus
} from '@/types';

// Schema de validação (sem expected_admission_type, mentor_id, notes)
const integrationSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  birth: z.string().optional(),
  gender: z.union([z.literal(''), z.enum(['masculino', 'feminino'])]).optional(),
  marital_status: z.union([
    z.literal(''),
    z.enum(['solteiro', 'casado', 'divorciado', 'viuvo', 'outro'])
  ]).optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  expected_congregation_id: z.union([z.literal(''), z.string().uuid()]).optional(),
});

type IntegrationFormData = z.infer<typeof integrationSchema>;

interface PublicIntegrationFormProps {
  onSubmit: (payload: IntegrationMemberPayload) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  churchName?: string;
}

const genderOptions: { value: '' | IntegrationGender; label: string }[] = [
  { value: '', label: 'Não informado' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' }
];

const maritalStatusOptions: { value: '' | IntegrationMaritalStatus; label: string }[] = [
  { value: '', label: 'Não informado' },
  { value: 'solteiro', label: 'Solteiro' },
  { value: 'casado', label: 'Casado' },
  { value: 'divorciado', label: 'Divorciado' },
  { value: 'viuvo', label: 'Viúvo' },
  { value: 'outro', label: 'Outro' }
];

// Função para formatar telefone
const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
};

export function PublicIntegrationForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false
}: PublicIntegrationFormProps) {
  const { congregations, loading: loadingFilters } = useFiltersData();

  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [whatsappDisplay, setWhatsappDisplay] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      name: '',
      birth: '',
      gender: '',
      marital_status: '',
      phone: '',
      whatsapp: '',
      expected_congregation_id: '',
    }
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'phone' | 'whatsapp') => {
    const value = e.target.value;
    const formatted = formatPhone(value);

    if (field === 'phone') {
      setPhoneDisplay(formatted);
      setValue('phone', value.replace(/\D/g, ''));
    } else {
      setWhatsappDisplay(formatted);
      setValue('whatsapp', value.replace(/\D/g, ''));
    }
  };

  const handleFormSubmit = async (data: IntegrationFormData) => {
    const payload: IntegrationMemberPayload = {
      name: data.name.trim(),
      birth: data.birth ? data.birth : null,
      gender: data.gender ? (data.gender as IntegrationGender) : null,
      marital_status: data.marital_status ? (data.marital_status as IntegrationMaritalStatus) : null,
      phone: data.phone && data.phone.trim() !== '' ? data.phone.trim() : null,
      whatsapp: data.whatsapp && data.whatsapp.trim() !== '' ? data.whatsapp.trim() : null,
      expected_congregation_id: data.expected_congregation_id && data.expected_congregation_id !== '' ? data.expected_congregation_id : null,
      // Campos não incluídos no formulário público:
      expected_admission_type: null,
      mentor_id: null,
      notes: null
    };

    await onSubmit(payload);

    // Limpar formulário após sucesso
    setPhoneDisplay('');
    setWhatsappDisplay('');
    reset();
  };

  const congregationOptions = useMemo(() => {
    return [
      { value: '', label: 'Sede' },
      ...congregations.map(congregation => ({
        value: congregation.id,
        label: congregation.name
      }))
    ];
  }, [congregations]);

  useEffect(() => {
    register('gender');
    register('marital_status');
    register('expected_congregation_id');
  }, [register]);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nome completo"
          placeholder="Informe o nome"
          {...register('name')}
          error={errors.name?.message}
          disabled={isLoading}
        />

        <Input
          label="Data de nascimento"
          type="date"
          {...register('birth')}
          error={errors.birth?.message}
          disabled={isLoading}
        />

        <Select
          options={genderOptions.map(option => ({ value: option.value, label: option.label }))}
          value={watch('gender') ?? ''}
          onChange={(value) => setValue('gender', value as IntegrationFormData['gender'])}
          label="Gênero"
          placeholder="Selecione"
          disabled={isLoading}
        />

        <Select
          options={maritalStatusOptions.map(option => ({ value: option.value, label: option.label }))}
          value={watch('marital_status') ?? ''}
          onChange={(value) => setValue('marital_status', value as IntegrationFormData['marital_status'])}
          label="Estado civil"
          placeholder="Selecione"
          disabled={isLoading}
        />

        <Input
          label="Telefone"
          placeholder="(00) 00000-0000"
          value={phoneDisplay}
          onChange={(e) => handlePhoneChange(e, 'phone')}
          maxLength={15}
          error={errors.phone?.message}
          disabled={isLoading}
        />

        <Input
          label="WhatsApp"
          placeholder="(00) 00000-0000"
          value={whatsappDisplay}
          onChange={(e) => handlePhoneChange(e, 'whatsapp')}
          maxLength={15}
          error={errors.whatsapp?.message}
          disabled={isLoading}
        />

        <Select
          options={congregationOptions}
          value={watch('expected_congregation_id') ?? ''}
          onChange={(value) => setValue('expected_congregation_id', value as IntegrationFormData['expected_congregation_id'])}
          label="Congregação prevista"
          placeholder="Selecione"
          disabled={isLoading || loadingFilters}
          helperText={loadingFilters ? 'Carregando congregações...' : undefined}
        />
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          Enviar Cadastro
        </Button>
      </div>
    </form>
  );
}


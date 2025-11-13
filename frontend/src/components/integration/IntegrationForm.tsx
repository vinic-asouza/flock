import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useFiltersData } from '@/hooks/useFiltersData';
import { useMemberOptions } from '@/hooks/useMemberOptions';
import {
  IntegrationMember,
  IntegrationMemberPayload,
  IntegrationAdmissionType,
  IntegrationGender,
  IntegrationMaritalStatus,
  IntegrationStatus
} from '@/types';

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
  expected_admission_type: z.union([
    z.literal(''),
    z.enum(['batismo', 'transferencia', 'profissao de fe', 'outro'])
  ]).optional(),
  expected_congregation_id: z.union([z.literal(''), z.string().uuid()]).optional(),
  mentor_id: z.union([z.literal(''), z.string().uuid()]).optional(),
  notes: z.string().optional(),
  status: z.union([
    z.literal(''),
    z.enum(['em_progresso', 'integrado', 'descartado'])
  ]).optional(),
});

type IntegrationFormData = z.infer<typeof integrationSchema>;

interface IntegrationFormProps {
  initialData?: IntegrationMember | null;
  mode: 'create' | 'edit';
  isLoading?: boolean;
  onSubmit: (payload: IntegrationMemberPayload) => Promise<void>;
  onCancel: () => void;
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

const admissionTypeOptions: { value: '' | IntegrationAdmissionType; label: string }[] = [
  { value: '', label: 'Não informado' },
  { value: 'batismo', label: 'Batismo' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'profissao de fe', label: 'Profissão de Fé' },
  { value: 'outro', label: 'Outro' }
];

const statusOptions: { value: '' | IntegrationStatus; label: string }[] = [
  { value: '', label: 'Padrão (Em progresso)' },
  { value: 'em_progresso', label: 'Em progresso' },
  { value: 'integrado', label: 'Integrado' },
  { value: 'descartado', label: 'Descartado' }
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

export function IntegrationForm({
  initialData = null,
  mode,
  isLoading = false,
  onSubmit,
  onCancel
}: IntegrationFormProps) {
  const { congregations, loading: loadingFilters } = useFiltersData();
  const {
    options: mentorOptionsData,
    loading: loadingMentors,
    setSearch: setMentorSearch
  } = useMemberOptions();

  const [selectedMentorLabel, setSelectedMentorLabel] = useState<string>('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [whatsappDisplay, setWhatsappDisplay] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      birth: initialData?.birth ? initialData.birth.slice(0, 10) : '',
      gender: initialData?.gender ?? '',
      marital_status: initialData?.marital_status ?? '',
      phone: initialData?.phone ?? '',
      whatsapp: initialData?.whatsapp ?? '',
      expected_admission_type: initialData?.expected_admission_type ?? '',
      expected_congregation_id: initialData?.expected_congregation_id ?? '',
      mentor_id: initialData?.mentor_id ?? '',
      notes: initialData?.notes ?? '',
      status: initialData?.status ?? 'em_progresso'
    }
  });

  const mentorId = watch('mentor_id') ?? '';

  useEffect(() => {
    register('gender');
    register('marital_status');
    register('expected_admission_type');
    register('expected_congregation_id');
    register('mentor_id');
    register('status');
  }, [register]);

  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name ?? '');
      setValue('birth', initialData.birth ? initialData.birth.slice(0, 10) : '');
      setValue('gender', initialData.gender ?? '');
      setValue('marital_status', initialData.marital_status ?? '');
      setValue('phone', initialData.phone ?? '');
      setValue('whatsapp', initialData.whatsapp ?? '');
      setValue('expected_admission_type', initialData.expected_admission_type ?? '');
      setValue('expected_congregation_id', initialData.expected_congregation_id ?? '');
      setValue('mentor_id', initialData.mentor_id ?? '');
      setValue('notes', initialData.notes ?? '');
      setValue('status', initialData.status ?? 'em_progresso');
      if (initialData.mentor?.name) {
        setSelectedMentorLabel(initialData.mentor.name);
      }
      // Inicializar displays formatados
      if (initialData.phone) {
        setPhoneDisplay(formatPhone(initialData.phone));
      }
      if (initialData.whatsapp) {
        setWhatsappDisplay(formatPhone(initialData.whatsapp));
      }
    } else {
      // Limpar displays quando não há initialData
      setPhoneDisplay('');
      setWhatsappDisplay('');
    }
  }, [initialData, setValue]);

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
    if (!mentorId) return;
    const match = mentorOptionsData.find(option => option.id === mentorId);
    if (match) {
      setSelectedMentorLabel(match.name);
    }
  }, [mentorOptionsData, mentorId]);

  const mentorSelectOptions = useMemo(() => {
    const base = [
      { value: '', label: 'Não informado' },
      ...mentorOptionsData.map(option => ({
        value: option.id,
        label: option.name
      }))
    ];

    if (mentorId && !base.some(option => option.value === mentorId)) {
      base.push({ value: mentorId, label: selectedMentorLabel || 'Responsável selecionado' });
    }

    return base;
  }, [mentorOptionsData, mentorId, selectedMentorLabel]);

  const handleMentorChange = (value: string) => {
    setValue('mentor_id', value as IntegrationFormData['mentor_id']);
    const match = mentorOptionsData.find(option => option.id === value);
    if (match) {
      setSelectedMentorLabel(match.name);
    } else if (!value) {
      setSelectedMentorLabel('');
    }
  };

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
      expected_admission_type: data.expected_admission_type ? (data.expected_admission_type as IntegrationAdmissionType) : null,
      expected_congregation_id: data.expected_congregation_id && data.expected_congregation_id !== '' ? data.expected_congregation_id : null,
      mentor_id: data.mentor_id && data.mentor_id !== '' ? data.mentor_id : null,
      notes: data.notes && data.notes.trim() !== '' ? data.notes.trim() : null
    };

    if (mode === 'edit') {
      payload.status = data.status ? (data.status as IntegrationStatus) : undefined;
    }

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
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
          options={admissionTypeOptions.map(option => ({ value: option.value, label: option.label }))}
          value={watch('expected_admission_type') ?? ''}
          onChange={(value) => setValue('expected_admission_type', value as IntegrationFormData['expected_admission_type'])}
          label="Tipo de admissão previsto"
          placeholder="Selecione"
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

        <Select
          options={mentorSelectOptions}
          value={mentorId}
          onChange={handleMentorChange}
          label="Responsável / Discipulador"
          placeholder="Digite para buscar"
          disabled={isLoading}
          helperText="Busque pelo nome para localizar o responsável"
          searchable
          onSearchChange={setMentorSearch}
        />

        {mode === 'edit' && (
          <Select
            options={statusOptions.map(option => ({ value: option.value, label: option.label }))}
            value={watch('status') ?? ''}
            onChange={(value) => setValue('status', value as IntegrationFormData['status'])}
            label="Status"
            placeholder="Selecione"
            disabled={isLoading}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observações
        </label>
        <textarea
          {...register('notes')}
          className="w-full min-h-[100px] rounded-md border border-gray-300 bg-white px-3 py-2 text-[15px] text-[#222] placeholder-[#888] focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-colors"
          placeholder="Anotações sobre o acompanhamento deste integrante"
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {mode === 'create' ? 'Cadastrar integrante' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useFiltersData } from '@/hooks/useFiltersData';
import { useIbgeData } from '@/hooks/useIbgeData';

// Schema de validação
const memberSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos').optional().or(z.literal('')),
  whatsapp: z.string().min(10, 'WhatsApp deve ter pelo menos 10 dígitos').optional().or(z.literal('')),
  birth: z.string().min(1, 'Data de nascimento é obrigatória'),
  gender: z.enum(['Masculino', 'Feminino']),
  marital_status: z.enum(['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro']),
  nationality: z.string().optional().or(z.literal('')),
  document: z.string().optional().or(z.literal('')),
  spouse: z.string().optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  complement: z.string().optional().or(z.literal('')),
  neighborhood: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  cep: z.string().length(8, 'CEP deve ter 8 dígitos').optional().or(z.literal('')),
  baptism_date: z.string().optional().or(z.literal('')),
  admission: z.string().optional().or(z.literal('')),
  admission_date: z.string().optional().or(z.literal('')),
  role_id: z.string().optional().or(z.literal('')).nullable(),
  congregation_id: z.string().optional().or(z.literal('')).nullable(),
  active: z.boolean(),
});

type MemberFormData = z.infer<typeof memberSchema>;

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
  // Campos retornados pela API com detalhes completos
  role?: {
    id: string;
    name: string;
    description?: string;
  } | null;
  congregation?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    leader?: string;
    phone?: string;
  } | null;
}

interface MemberFormProps {
  member?: Member | null;
  onSubmit: (data: MemberFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

// Função para formatar telefone
const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
};

// Função para formatar CEP
const formatCEP = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
};

// Função para formatar data
const formatDate = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
};

// Função para converter data ISO para DD/MM/AAAA
const formatDateFromISO = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
};

// Função para converter DD/MM/AAAA para ISO
const formatDateToISO = (formattedDate: string): string | null => {
  if (!formattedDate) return null;
  const parts = formattedDate.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export function MemberForm({ member, onSubmit, onCancel, isLoading = false, mode }: MemberFormProps) {
  const { roles, congregations, loading: filtersLoading } = useFiltersData();
  const { states, cities, loadingCities, fetchCities } = useIbgeData();

  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [whatsappDisplay, setWhatsappDisplay] = useState('');
  const [cepDisplay, setCepDisplay] = useState('');
  const [birthDisplay, setBirthDisplay] = useState('');
  const [baptismDateDisplay, setBaptismDateDisplay] = useState('');
  const [admissionDateDisplay, setAdmissionDateDisplay] = useState('');
  const [formReady, setFormReady] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: mode === 'create' ? {
      active: true,
      gender: 'Masculino',
      marital_status: 'Solteiro',
    } : {
      // Para modo edit, deixar vazio e usar reset
    },
  });

  const selectedState = watch('state');

  // Resetar formulário quando member mudar (para modo edit)
  useEffect(() => {
    if (member && mode === 'edit') {
      // Usar setValue para definir cada campo individualmente
      setValue('name', member.name);
      setValue('email', member.email || '');
      setValue('phone', member.phone || '');
      setValue('whatsapp', member.whatsapp || '');
      setValue('birth', formatDateFromISO(member.birth));
      setValue('gender', member.gender as 'Masculino' | 'Feminino');
      setValue('marital_status', member.marital_status as 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro');
      setValue('nationality', member.nationality || '');
      setValue('document', member.document || '');
      setValue('spouse', member.spouse || '');
      setValue('occupation', member.occupation || '');
      setValue('address', member.address || '');
      setValue('complement', member.complement || '');
      setValue('neighborhood', member.neighborhood || '');
      setValue('city', member.city || '');
      setValue('state', member.state || '');
      setValue('cep', member.cep ? member.cep.replace(/\D/g, '') : '');
      setValue('baptism_date', formatDateFromISO(member.baptism_date));
      setValue('admission', member.admission || '');
      setValue('admission_date', formatDateFromISO(member.admission_date));
      setValue('active', member.active);
      
      // Definir role_id e congregation_id
      const roleId = member.role?.id || member.role_id || '';
      const congregationId = member.congregation?.id || member.congregation_id || '';
      
      setValue('role_id', roleId);
      setValue('congregation_id', congregationId);
      
      // Marcar formulário como pronto
      setFormReady(true);
    } else if (mode === 'create') {
      setFormReady(true);
    }
  }, [member, mode, setValue]);

  // Carregar cidades quando estado mudar
  useEffect(() => {
    if (selectedState) {
      const state = states.find(s => s.sigla === selectedState);
      if (state) {
        fetchCities(state.id.toString());
      }
    }
  }, [selectedState, states, fetchCities]);

  // Carregar cidades quando member for carregado no modo edit
  useEffect(() => {
    if (member && mode === 'edit' && member.state && states.length > 0) {
      const state = states.find(s => s.sigla === member.state);
      if (state) {
        fetchCities(state.id.toString());
      }
    }
  }, [member, mode, states, fetchCities]);

  // Inicializar displays formatados
  useEffect(() => {
    if (member) {
      if (member.phone) setPhoneDisplay(formatPhone(member.phone));
      if (member.whatsapp) setWhatsappDisplay(formatPhone(member.whatsapp));
      if (member.cep) setCepDisplay(formatCEP(member.cep));
      if (member.birth) setBirthDisplay(formatDateFromISO(member.birth));
      if (member.baptism_date) setBaptismDateDisplay(formatDateFromISO(member.baptism_date));
      if (member.admission_date) setAdmissionDateDisplay(formatDateFromISO(member.admission_date));
    }
  }, [member]);

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

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCEP(value);
    setCepDisplay(formatted);
    setValue('cep', value.replace(/\D/g, ''));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'birth' | 'baptism_date' | 'admission_date') => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, '');

    // Aplicar máscara DD/MM/AAAA
    let formatted = '';
    if (numbers.length <= 2) {
      formatted = numbers;
    } else if (numbers.length <= 4) {
      formatted = `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    } else {
      formatted = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    }

    // Atualizar display e valor do formulário
    if (field === 'birth') {
      setBirthDisplay(formatted);
      setValue('birth', formatted);
    } else if (field === 'baptism_date') {
      setBaptismDateDisplay(formatted);
      setValue('baptism_date', formatted);
    } else if (field === 'admission_date') {
      setAdmissionDateDisplay(formatted);
      setValue('admission_date', formatted);
    }
  };

  const handleFormSubmit = async (data: MemberFormData) => {
    try {
      // Converter datas para formato ISO antes de enviar
      const memberData = {
        ...data,
        birth: formatDateToISO(data.birth) || '',
        baptism_date: data.baptism_date ? formatDateToISO(data.baptism_date) || undefined : undefined,
        admission_date: data.admission_date ? formatDateToISO(data.admission_date) || undefined : undefined,
        // Tratar campos UUID opcionais - enviar null quando vazio
        role_id: data.role_id || null,
        congregation_id: data.congregation_id || null,
      };

      await onSubmit(memberData);

      // Limpar displays formatados após sucesso
      setPhoneDisplay('');
      setWhatsappDisplay('');
      setCepDisplay('');
      setBirthDisplay('');
      setBaptismDateDisplay('');
      setAdmissionDateDisplay('');
      reset();
    } catch (error) {
      // Erro será tratado pelo componente pai
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 p-6">
      {/* Informações Básicas */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Informações Básicas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nome Completo *"
            placeholder="Digite o nome completo"
            error={errors.name?.message}
            isLoading={isLoading}
            {...register('name')}
          />

          <Input
            label="Email"
            type="email"
            placeholder="email@exemplo.com"
            error={errors.email?.message}
            isLoading={isLoading}
            {...register('email')}
          />

          <Input
            label="Telefone"
            placeholder="(11) 99999-9999"
            value={phoneDisplay}
            onChange={(e) => handlePhoneChange(e, 'phone')}
            maxLength={15}
            isLoading={isLoading}
          />

          <Input
            label="WhatsApp"
            placeholder="(11) 99999-9999"
            value={whatsappDisplay}
            onChange={(e) => handlePhoneChange(e, 'whatsapp')}
            maxLength={15}
            isLoading={isLoading}
          />

          <Input
            label="Data de Nascimento *"
            placeholder="DD/MM/AAAA"
            value={birthDisplay}
            onChange={(e) => handleDateChange(e, 'birth')}
            maxLength={10}
            error={errors.birth?.message}
            isLoading={isLoading}
          />

          <Select
            label="Gênero *"
            value={watch('gender') || ''}
            onChange={(value) => setValue('gender', value as 'Masculino' | 'Feminino')}
            options={[
              { value: 'Masculino', label: 'Masculino' },
              { value: 'Feminino', label: 'Feminino' }
            ]}
            placeholder="Selecione o gênero"
            disabled={isLoading}
            error={errors.gender?.message}
          />

          <Select
            label="Estado Civil *"
            value={watch('marital_status') || ''}
            onChange={(value) => setValue('marital_status', value as 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro')}
            options={[
              { value: 'Solteiro', label: 'Solteiro' },
              { value: 'Casado', label: 'Casado' },
              { value: 'Divorciado', label: 'Divorciado' },
              { value: 'Viúvo', label: 'Viúvo' },
              { value: 'Outro', label: 'Outro' }
            ]}
            placeholder="Selecione o estado civil"
            disabled={isLoading}
            error={errors.marital_status?.message}
          />

          <Input
            label="Nacionalidade"
            placeholder="Brasileira"
            error={errors.nationality?.message}
            isLoading={isLoading}
            {...register('nationality')}
          />

          <Input
            label="Profissão"
            placeholder="Digite a profissão"
            error={errors.occupation?.message}
            isLoading={isLoading}
            {...register('occupation')}
          />

          <Input
            label="Documento"
            placeholder="CPF, RG, etc."
            error={errors.document?.message}
            isLoading={isLoading}
            {...register('document')}
          />

          <Input
            label="Cônjuge"
            placeholder="Nome do cônjuge"
            error={errors.spouse?.message}
            isLoading={isLoading}
            {...register('spouse')}
          />
        </div>
      </div>

      {/* Endereço */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Endereço
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Endereço"
            placeholder="Rua das Flores, 123"
            error={errors.address?.message}
            isLoading={isLoading}
            {...register('address')}
          />

          <Input
            label="Complemento"
            placeholder="Apartamento, bloco, etc."
            error={errors.complement?.message}
            isLoading={isLoading}
            {...register('complement')}
          />

          <Input
            label="Bairro"
            placeholder="Centro"
            error={errors.neighborhood?.message}
            isLoading={isLoading}
            {...register('neighborhood')}
          />

          <Select
            label="Estado"
            value={watch('state') || ''}
            onChange={(value) => setValue('state', value)}
            options={[
              { value: '', label: 'Selecione o estado' },
              ...states.map((state) => ({
                value: state.sigla,
                label: state.nome
              }))
            ]}
            disabled={isLoading}
            error={errors.state?.message}
            searchable={true}
          />

          <Select
            label="Cidade"
            value={watch('city') || ''}
            onChange={(value) => setValue('city', value)}
            options={[
              { 
                value: '', 
                label: !selectedState
                  ? 'Selecione o estado primeiro'
                  : loadingCities
                    ? 'Carregando...'
                    : 'Selecione a cidade'
              },
              ...cities.map((city) => ({
                value: city.nome,
                label: city.nome
              }))
            ]}
            disabled={!selectedState || loadingCities || isLoading}
            error={errors.city?.message}
            searchable={true}
          />

          <Input
            label="CEP"
            placeholder="12345-678"
            value={cepDisplay}
            onChange={handleCEPChange}
            maxLength={9}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Informações Eclesiásticas */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Informações Eclesiásticas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Data de Batismo"
            placeholder="DD/MM/AAAA"
            value={baptismDateDisplay}
            onChange={(e) => handleDateChange(e, 'baptism_date')}
            maxLength={10}
            isLoading={isLoading}
          />

          <Input
            label="Data de Admissão"
            placeholder="DD/MM/AAAA"
            value={admissionDateDisplay}
            onChange={(e) => handleDateChange(e, 'admission_date')}
            maxLength={10}
            isLoading={isLoading}
          />

          <Select
            label="Tipo de Admissão"
            value={watch('admission') || ''}
            onChange={(value) => setValue('admission', value)}
            options={[
              { value: '', label: 'Selecione o tipo de admissão' },
              { value: 'Batismo', label: 'Batismo' },
              { value: 'Transferencia', label: 'Transferência' },
              { value: 'Profissão de fé', label: 'Profissão de fé' },
              { value: 'Outro', label: 'Outro' }
            ]}
            disabled={isLoading}
            error={errors.admission?.message}
          />

          <Select
            label="Função"
            value={watch('role_id') || ''}
            onChange={(value) => setValue('role_id', value)}
            options={[
              { value: '', label: 'Nenhuma' },
              ...roles.map((role) => ({
                value: role.id,
                label: role.name
              }))
            ]}
            disabled={filtersLoading || isLoading}
          />

          <Select
            label="Congregação"
            value={watch('congregation_id') || ''}
            onChange={(value) => setValue('congregation_id', value)}
            options={[
              { value: '', label: 'Nenhuma' },
              ...congregations.map((congregation) => ({
                value: congregation.id,
                label: congregation.name
              }))
            ]}
            disabled={filtersLoading || isLoading}
          />

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="active"
              className="rounded border-gray-300 text-primary focus:ring-primary/20"
              disabled={isLoading}
              {...register('active')}
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">
              Membro ativo
            </label>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
        >
          {mode === 'create' ? 'Criar Membro' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  );
} 
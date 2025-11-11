'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useFiltersData } from '@/hooks/useFiltersData';
import { useIbgeData } from '@/hooks/useIbgeData';
import { useProfessions } from '@/hooks/useProfessions';

// Schema de validação
const memberSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  whatsapp: z.string().min(10, 'WhatsApp deve ter pelo menos 10 dígitos').optional().or(z.literal('')),
  birth: z.string().min(1, 'Data de nascimento é obrigatória'),
  gender: z.enum(['Masculino', 'Feminino']),
  marital_status: z.enum(['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro']),
  nationality: z.string().min(1, 'Nacionalidade é obrigatória'),
  nationality_other: z.string().optional().or(z.literal('')),
  document: z.string()
    .min(1, 'CPF é obrigatório')
    .refine((cpf) => {
      // Remove caracteres não numéricos
      const cleanCpf = cpf.replace(/\D/g, '');
      
      // Verifica se tem 11 dígitos
      if (cleanCpf.length !== 11) return false;
      
      // Verifica se todos os dígitos são iguais (CPF inválido)
      if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
      
      // Validação do primeiro dígito verificador
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanCpf[i]) * (10 - i);
      }
      let remainder = sum % 11;
      let firstDigit = remainder < 2 ? 0 : 11 - remainder;
      
      if (parseInt(cleanCpf[9]) !== firstDigit) return false;
      
      // Validação do segundo dígito verificador
      sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanCpf[i]) * (11 - i);
      }
      remainder = sum % 11;
      let secondDigit = remainder < 2 ? 0 : 11 - remainder;
      
      return parseInt(cleanCpf[10]) === secondDigit;
    }, 'CPF inválido'),
  spouse: z.string().optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),
  occupation_other: z.string().optional().or(z.literal('')),
  address: z.string().min(1, 'Endereço é obrigatório'),
  complement: z.string().optional().or(z.literal('')),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(1, 'Estado é obrigatório'),
  cep: z.string().length(8, 'CEP deve ter 8 dígitos'),
  baptism_date: z.string().optional().or(z.literal('')),
  admission: z.string().min(1, 'Tipo de admissão é obrigatório'),
  admission_date: z.string().min(1, 'Data de admissão é obrigatória'),
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

// Função para formatar CPF
const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 6) {
    return numbers.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  } else if (numbers.length <= 9) {
    return numbers.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  } else {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  }
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
  const { professions, loading: professionsLoading, searchProfessions } = useProfessions();

  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [whatsappDisplay, setWhatsappDisplay] = useState('');
  const [cepDisplay, setCepDisplay] = useState('');
  const [birthDisplay, setBirthDisplay] = useState('');
  const [baptismDateDisplay, setBaptismDateDisplay] = useState('');
  const [admissionDateDisplay, setAdmissionDateDisplay] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');
  const [nationalityOtherError, setNationalityOtherError] = useState('');
  const [occupationOtherError, setOccupationOtherError] = useState('');
  const prevMemberRef = useRef<Member | null>(null);

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
  const selectedNationality = watch('nationality');
  const nationalityOtherValue = watch('nationality_other');
  const selectedOccupation = watch('occupation');
  const occupationOtherValue = watch('occupation_other');
  const selectedMaritalStatus = watch('marital_status');

  // Preencher formulário quando member mudar
  useEffect(() => {
    if (!member) {
      prevMemberRef.current = null;
      return;
    }

    if (prevMemberRef.current && prevMemberRef.current.id === member.id) {
      return;
    }

    prevMemberRef.current = member;

    setValue('name', member.name);
    setValue('email', member.email || '');
    setValue('phone', member.phone || '');
    setValue('whatsapp', member.whatsapp || '');
    setValue('birth', formatDateFromISO(member.birth));
    setValue('gender', member.gender as 'Masculino' | 'Feminino');
    setValue('marital_status', member.marital_status as 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro');

    const nationality = member.nationality || '';
    if (nationality === 'Brasileiro(a)' || nationality === '') {
      setValue('nationality', nationality);
      setValue('nationality_other', '');
    } else {
      setValue('nationality', 'Outra');
      setValue('nationality_other', nationality);
    }

    setValue('document', member.document || '');
    setValue('spouse', member.spouse || '');

    const occupation = member.occupation || '';
    const isStandardOccupation = professions.some(p => p.name === occupation);
    if (isStandardOccupation || occupation === '') {
      setValue('occupation', occupation);
      setValue('occupation_other', '');
    } else {
      setValue('occupation', 'Outra');
      setValue('occupation_other', occupation);
    }

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

    const roleId = member.role?.id || member.role_id || '';
    const congregationId = member.congregation?.id || member.congregation_id || '';
    setValue('role_id', roleId);
    setValue('congregation_id', congregationId);
  }, [member, professions, setValue]);

  // Carregar cidades quando estado mudar
  useEffect(() => {
    if (selectedState) {
      const state = states.find(s => s.sigla === selectedState);
      if (state) {
        fetchCities(state.id.toString());
      }
    }
  }, [selectedState, states, fetchCities]);

  // Carregar cidades quando member for carregado (modo edit ou prefill em create)
  useEffect(() => {
    if (member && member.state && states.length > 0) {
      const state = states.find(s => s.sigla === member.state);
      if (state) {
        fetchCities(state.id.toString());
      }
    }
  }, [member, states, fetchCities]);

  // Limpar erro de nacionalidade quando usuário digitar
  useEffect(() => {
    if (nationalityOtherError && nationalityOtherValue && nationalityOtherValue.trim() !== '') {
      setNationalityOtherError('');
    }
  }, [nationalityOtherValue, nationalityOtherError]);

  // Limpar erro de profissão quando usuário digitar
  useEffect(() => {
    if (occupationOtherError && occupationOtherValue && occupationOtherValue.trim() !== '') {
      setOccupationOtherError('');
    }
  }, [occupationOtherValue, occupationOtherError]);

  // Inicializar displays formatados
  useEffect(() => {
    if (member) {
      if (member.phone) setPhoneDisplay(formatPhone(member.phone));
      if (member.whatsapp) setWhatsappDisplay(formatPhone(member.whatsapp));
      if (member.cep) setCepDisplay(formatCEP(member.cep));
      if (member.document) setCpfDisplay(formatCPF(member.document));
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

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCPF(value);
    setCpfDisplay(formatted);
    setValue('document', value.replace(/\D/g, ''));
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
      // Validar nacionalidade: se "Outra" for selecionada, nationality_other deve estar preenchido
      if (data.nationality === 'Outra' && (!data.nationality_other || data.nationality_other.trim() === '')) {
        setNationalityOtherError('Por favor, especifique a nacionalidade');
        return;
      } else {
        setNationalityOtherError('');
      }

      // Validar profissão: se "Outra" for selecionada, occupation_other deve estar preenchido
      if (data.occupation === 'Outra' && (!data.occupation_other || data.occupation_other.trim() === '')) {
        setOccupationOtherError('Por favor, especifique a profissão');
        return;
      } else {
        setOccupationOtherError('');
      }

      // Converter datas para formato ISO antes de enviar
      const memberData = {
        ...data,
        birth: formatDateToISO(data.birth) || '',
        baptism_date: data.baptism_date ? formatDateToISO(data.baptism_date) || undefined : undefined,
        admission_date: formatDateToISO(data.admission_date) || '',
        // Tratar nacionalidade: se for "Outra", usar o valor do campo nationality_other; senão usar o valor selecionado
        nationality: data.nationality === 'Outra' ? (data.nationality_other || '') : data.nationality,
        // Tratar profissão: se for "Outra", usar o valor do campo occupation_other; senão usar o valor selecionado
        occupation: data.occupation === 'Outra' ? (data.occupation_other || '') : data.occupation,
        // Remover campos auxiliares do payload
        nationality_other: undefined,
        occupation_other: undefined,
        // Tratar campos UUID opcionais - enviar null quando vazio
        role_id: data.role_id || null,
        congregation_id: data.congregation_id || null,
      };

      await onSubmit(memberData);

      // Limpar displays formatados e resetar formulário apenas após sucesso
      setPhoneDisplay('');
      setWhatsappDisplay('');
      setCepDisplay('');
      setCpfDisplay('');
      setBirthDisplay('');
      setBaptismDateDisplay('');
      setAdmissionDateDisplay('');
      setNationalityOtherError('');
      setOccupationOtherError('');
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
            label="Telefone *"
            placeholder="(11) 99999-9999"
            value={phoneDisplay}
            onChange={(e) => handlePhoneChange(e, 'phone')}
            maxLength={15}
            error={errors.phone?.message}
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
          />

          <Select
            label="Nacionalidade *"
            value={watch('nationality') || ''}
            onChange={(value) => setValue('nationality', value)}
            options={[
              { value: '', label: 'Selecione a nacionalidade' },
              { value: 'Brasileiro(a)', label: 'Brasileiro(a)' },
              { value: 'Outra', label: 'Outra' }
            ]}
            placeholder="Selecione a nacionalidade"
            disabled={isLoading}
            error={errors.nationality?.message}
          />

          {selectedNationality === 'Outra' && (
            <Input
              label="Especifique a nacionalidade *"
              placeholder="Digite a nacionalidade"
              error={nationalityOtherError}
              isLoading={isLoading}
              {...register('nationality_other')}
            />
          )}

          <Select
            label="Profissão"
            value={selectedOccupation || ''}
            onChange={(value) => setValue('occupation', value)}
            options={[
              { value: '', label: 'Selecione a profissão' },
              ...professions.map((profession) => ({
                value: profession.name,
                label: profession.name
              })),
              { value: 'Outra', label: 'Outra' }
            ]}
            placeholder="Selecione a profissão"
            disabled={professionsLoading || isLoading}
            searchable={true}
          />

          {selectedOccupation === 'Outra' && (
            <Input
              label="Especifique a profissão *"
              placeholder="Digite a profissão"
              error={occupationOtherError}
              isLoading={isLoading}
              {...register('occupation_other')}
            />
          )}

          <Input
            label="CPF *"
            placeholder="000.000.000-00"
            value={cpfDisplay}
            onChange={handleCPFChange}
            maxLength={14}
            error={errors.document?.message}
            isLoading={isLoading}
          />

          {selectedMaritalStatus === 'Casado' && (
            <Input
              label="Cônjuge"
              placeholder="Nome do cônjuge"
              error={errors.spouse?.message}
              isLoading={isLoading}
              {...register('spouse')}
            />
          )}
        </div>
      </div>

      {/* Endereço */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Endereço
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Endereço *"
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
            label="Bairro *"
            placeholder="Centro"
            error={errors.neighborhood?.message}
            isLoading={isLoading}
            {...register('neighborhood')}
          />

          <Select
            label="Estado *"
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
            searchable={true}
            error={errors.state?.message}
          />

          <Select
            label="Cidade *"
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
            searchable={true}
            error={errors.city?.message}
          />

          <Input
            label="CEP *"
            placeholder="12345-678"
            value={cepDisplay}
            onChange={handleCEPChange}
            maxLength={9}
            error={errors.cep?.message}
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
            label="Data de Admissão *"
            placeholder="DD/MM/AAAA"
            value={admissionDateDisplay}
            onChange={(e) => handleDateChange(e, 'admission_date')}
            maxLength={10}
            error={errors.admission_date?.message}
            isLoading={isLoading}
          />

          <Select
            label="Tipo de Admissão *"
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
          variant="secondary"
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
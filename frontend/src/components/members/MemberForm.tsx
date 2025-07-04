'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
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
  role_id: z.string().optional().or(z.literal('')),
  congregation_id: z.string().optional().or(z.literal('')),
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: member ? {
      ...member,
      // Garantir que campos opcionais sejam strings vazias se undefined
      email: member.email || '',
      phone: member.phone || '',
      whatsapp: member.whatsapp || '',
      document: member.document || '',
      spouse: member.spouse || '',
      complement: member.complement || '',
      cep: member.cep ? member.cep.replace(/\D/g, '') : '',
      // Converter datas do formato ISO para DD/MM/AAAA
      birth: formatDateFromISO(member.birth),
      baptism_date: formatDateFromISO(member.baptism_date),
      admission_date: formatDateFromISO(member.admission_date),
      admission: member.admission || '',
      role_id: member.role_id || '',
      congregation_id: member.congregation_id || '',
      // Garantir que gender e marital_status sejam do tipo correto
      gender: member.gender as 'Masculino' | 'Feminino',
      marital_status: member.marital_status as 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro',
    } : {
      active: true,
      gender: 'Masculino',
      marital_status: 'Solteiro',
    },
  });

  const selectedState = watch('state');

  // Carregar cidades quando estado mudar
  useEffect(() => {
    if (selectedState) {
      const state = states.find(s => s.sigla === selectedState);
      if (state) {
        fetchCities(state.id.toString());
      }
    }
  }, [selectedState, states, fetchCities]);

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
        // Tratar campos UUID opcionais - enviar undefined em vez de string vazia
        role_id: data.role_id || undefined,
        congregation_id: data.congregation_id || undefined,
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gênero *
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              {...register('gender')}
            >
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
            {errors.gender && (
              <p className="text-sm text-red-600 mt-1">{errors.gender.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado Civil *
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              {...register('marital_status')}
            >
              <option value="Solteiro">Solteiro</option>
              <option value="Casado">Casado</option>
              <option value="Divorciado">Divorciado</option>
              <option value="Viúvo">Viúvo</option>
              <option value="Outro">Outro</option>
            </select>
            {errors.marital_status && (
              <p className="text-sm text-red-600 mt-1">{errors.marital_status.message}</p>
            )}
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              {...register('state')}
            >
              <option value="">Selecione o estado</option>
              {states.map((state) => (
                <option key={state.sigla} value={state.sigla}>
                  {state.nome}
                </option>
              ))}
            </select>
            {errors.state && (
              <p className="text-sm text-red-600 mt-1">{errors.state.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cidade
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedState || loadingCities || isLoading}
              {...register('city')}
            >
              <option value="">
                {!selectedState 
                  ? 'Selecione o estado primeiro' 
                  : loadingCities 
                    ? 'Carregando...' 
                    : 'Selecione a cidade'
                }
              </option>
              {cities.map((city) => (
                <option key={city.id} value={city.nome}>
                  {city.nome}
                </option>
              ))}
            </select>
            {errors.city && (
              <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>
            )}
          </div>

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

          <Input
            label="Tipo de Admissão"
            placeholder="Ex: Batismo, Transferência, etc."
            error={errors.admission?.message}
            isLoading={isLoading}
            {...register('admission')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Função
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={filtersLoading || isLoading}
              {...register('role_id')}
            >
              <option value="">Selecione uma função</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Congregação
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={filtersLoading || isLoading}
              {...register('congregation_id')}
            >
              <option value="">Selecione uma congregação</option>
              {congregations.map((congregation) => (
                <option key={congregation.id} value={congregation.id}>
                  {congregation.name}
                </option>
              ))}
            </select>
          </div>

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
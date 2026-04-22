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
import { apiService } from '@/services/api';
import { Group } from '@/types';
import { validatePhone, validateCEP, validateCPFOrCNPJ, fetchCEPData, validateDateFormat } from '@/utils/validations';
import { formatDateToISO } from '@/utils';

// Schema de validação
const memberSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.trim() === '' || validatePhone(val), {
      message: 'Telefone inválido. Use o formato (XX) XXXX-XXXX ou (XX) 9XXXX-XXXX'
    }),
  whatsapp: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.trim() === '' || validatePhone(val), {
      message: 'WhatsApp inválido. Use o formato (XX) 9XXXX-XXXX'
    }),
  birth: z.string()
    .min(1, 'Data de nascimento é obrigatória')
    .refine((val) => {
      if (!val) return false;
      // Validar formato exato DD/MM/YYYY
      if (!validateDateFormat(val)) {
        return false;
      }
      const date = formatDateToISO(val);
      if (!date) return false;
      const birthDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Fim do dia de hoje
      return birthDate <= today;
    }, {
      message: 'Data de nascimento deve estar no formato DD/MM/YYYY (ex: 05/01/2001)'
    }),
  gender: z.enum(['Masculino', 'Feminino']),
  marital_status: z.enum(['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro']),
  nationality: z.string().optional().or(z.literal('')),
  nationality_other: z.string().optional().or(z.literal('')),
  document: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.trim() === '' || validateCPFOrCNPJ(val), {
      message: 'CPF ou CNPJ inválido'
    }),
  spouse: z.string().optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),
  occupation_other: z.string().optional().or(z.literal('')),
  address: z.string().min(1, 'Endereço é obrigatório'),
  complement: z.string().optional().or(z.literal('')),
  neighborhood: z.string().optional().or(z.literal('')),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(1, 'Estado é obrigatório'),
  cep: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.trim() === '' || validateCEP(val), {
      message: 'CEP inválido. Deve conter 8 dígitos'
    }),
  baptism_date: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.trim() === '' || validateDateFormat(val), {
      message: 'Data de batismo deve estar no formato DD/MM/YYYY (ex: 05/01/2001)'
    }),
  admission: z.string().min(1, 'Tipo de recebimento é obrigatório'),
  admission_date: z.string()
    .min(1, 'Data de recebimento é obrigatória')
    .refine((val) => {
      if (!val) return false;
      if (!validateDateFormat(val)) {
        return false;
      }
      const date = formatDateToISO(val);
      if (!date) return false;
      const admissionDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return admissionDate <= today;
    }, {
      message: 'Data de recebimento deve estar no formato DD/MM/YYYY (ex: 05/01/2001) e não pode ser no futuro'
    }),
  congregation_id: z.string().optional().or(z.literal('')).nullable(),
  father_name: z.string().optional().or(z.literal('')),
  mother_name: z.string().optional().or(z.literal('')),
  children: z.array(z.object({
    name: z.string().min(1, 'Nome do filho é obrigatório'),
    birth: z.string()
      .optional()
      .or(z.literal(''))
      .refine((val) => !val || val.trim() === '' || validateDateFormat(val), {
        message: 'Data de nascimento do filho deve estar no formato DD/MM/YYYY (ex: 05/01/2001)'
      }),
    dependent: z.boolean().optional(),
  })).optional(),
  active: z.boolean(),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface Child {
  id?: string;
  name: string;
  birth?: string;
  dependent?: boolean;
}

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
  neighborhood?: string;
  city: string;
  state: string;
  cep?: string;
  baptism_date?: string;
  admission?: string;
  admission_date?: string;
  congregation_id?: string;
  father_name?: string;
  mother_name?: string;
  children?: Child[];
  active: boolean;
  // Campos retornados pela API com detalhes completos
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

interface MemberFormProps {
  member?: Member | null;
  onSubmit: (data: MemberFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  error?: string | null;
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


// Função para formatar data (não utilizada atualmente)
// const formatDate = (value: string): string => {
//   const numbers = value.replace(/\D/g, '');
//   return numbers.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
// };

// Função para converter data ISO (YYYY-MM-DD ou ISO completa) para DD/MM/AAAA
// Evita problemas de timezone ao NÃO usar diretamente new Date('YYYY-MM-DD')
const formatDateFromISO = (value: string | null | undefined): string => {
  if (!value) return '';

  // Já está em formato DD/MM/AAAA
  if (value.includes('/')) return value;

  // Extrair apenas a parte da data (antes do T, se existir)
  const datePart = value.includes('T') ? value.split('T')[0] : value;

  // Conversão segura de YYYY-MM-DD -> DD/MM/AAAA sem usar Date()
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  // Fallback para formatos inesperados
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return '';
  }
};

// formatDateToISO agora é importado de @/utils

// ACHADO 12: parse manual de YYYY-MM-DD para evitar off-by-one em fusos UTC- no dia do aniversário.
// new Date('YYYY-MM-DD') interpreta como UTC midnight → em UTC-3 vira o dia anterior.
const calcularIdade = (birth: string): number | null => {
  if (!birth) return null;
  const datePart = birth.split('T')[0]; // suporte a strings ISO completas
  const parts = datePart.split('-').map(Number);
  if (parts.length < 3) return null;
  const [bYear, bMonth, bDay] = parts;
  if (isNaN(bYear) || isNaN(bMonth) || isNaN(bDay)) return null;
  const today = new Date();
  let age = today.getFullYear() - bYear;
  const monthDiff = today.getMonth() + 1 - bMonth;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bDay)) {
    age--;
  }
  return age >= 0 ? age : null;
};

export function MemberForm({ member, onSubmit, onCancel, isLoading = false, mode, error }: MemberFormProps) {
  const { congregations, loading: filtersLoading } = useFiltersData();
  const { states, cities, loadingCities, fetchCities } = useIbgeData();
  const { professions, loading: professionsLoading } = useProfessions();
  

  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [whatsappDisplay, setWhatsappDisplay] = useState('');
  const [cepDisplay, setCepDisplay] = useState('');
  const [birthDisplay, setBirthDisplay] = useState('');
  const [admissionDateDisplay, setAdmissionDateDisplay] = useState('');
  const [nationalityOtherError, setNationalityOtherError] = useState('');
  const [occupationOtherError, setOccupationOtherError] = useState('');
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [childrenBirthDisplays, setChildrenBirthDisplays] = useState<Record<number, string>>({});
  const [isInfantMember, setIsInfantMember] = useState(false);
  const prevMemberRef = useRef<Member | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    setError,
    clearErrors,
    watch,
    reset,
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: mode === 'create' ? {
      active: true,
      gender: 'Masculino',
      marital_status: 'Solteiro',
      congregation_id: '', // Sede por padrão - necessário para habilitar grupos
    } : {
      // Para modo edit, deixar vazio e usar reset
    },
    shouldUnregister: false, // Manter valores mesmo quando campos são desregistrados
  });

  const selectedState = watch('state');
  const selectedNationality = watch('nationality');
  const nationalityOtherValue = watch('nationality_other');
  const selectedOccupation = watch('occupation');
  const occupationOtherValue = watch('occupation_other');
  const selectedMaritalStatus = watch('marital_status');

  // Scroll para o erro quando ele aparecer
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [error]);

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
    
    // Determinar se é membro infantil baseado no tipo de recebimento
    const admissionType = member.admission || '';
    const isInfant = admissionType === 'Batismo Infantil' || admissionType === 'Apresentação (sem batismo)' || 
                     admissionType === 'Batismo não professo (Criança)' || admissionType === 'Apresentação (Criança)';
    setIsInfantMember(isInfant);
    
    setValue('father_name', member.father_name || '');
    setValue('mother_name', member.mother_name || '');
    setValue('active', member.active);
    
    // Carregar filhos se existirem
    if (member.children && member.children.length > 0) {
      // Converter datas dos filhos de ISO para formato DD/MM/AAAA se necessário
      const childrenWithFormattedDates = member.children.map(child => ({
        ...child,
        birth: child.birth ? (child.birth.includes('/') ? child.birth : formatDateFromISO(child.birth)) : undefined
      }));
      setChildren(childrenWithFormattedDates);
      // Inicializar displays de data de nascimento dos filhos
      const displays: Record<number, string> = {};
      childrenWithFormattedDates.forEach((child, index) => {
        if (child.birth) {
          displays[index] = child.birth.includes('/') ? child.birth : formatDateFromISO(child.birth);
        }
      });
      setChildrenBirthDisplays(displays);
    } else {
      setChildren([]);
      setChildrenBirthDisplays({});
    }

    const congregationId = member.congregation?.id || member.congregation_id || '';
    setValue('congregation_id', congregationId);

    // Carregar grupos do membro no modo edit
    if (member.groups && member.groups.length > 0) {
      setSelectedGroups(member.groups.map((g) => g.id));
    } else {
      setSelectedGroups([]);
    }
  }, [member, professions, setValue]);

  // Carregar grupos disponíveis quando congregação mudar
  const selectedCongregationId = watch('congregation_id');
  useEffect(() => {
    const loadGroups = async () => {
      const congregationIdToUse = selectedCongregationId || null;
      try {
        setLoadingGroups(true);
        // Se congregação vazia ou null, buscar grupos da sede
        const congregationParam = congregationIdToUse === '' || !congregationIdToUse ? 'sede' : congregationIdToUse;
        const response = await apiService.listGroups({ congregation_id: congregationParam });
        setAvailableGroups(response);
        
        // No modo edit, manter grupos selecionados se ainda estiverem disponíveis
        if (mode === 'edit' && member?.groups) {
          const availableGroupIds = response.map(g => g.id);
          // Manter apenas grupos que ainda estão disponíveis
          setSelectedGroups(prev => {
            const toKeep = prev.filter(id => availableGroupIds.includes(id));
            return toKeep;
          });
        }
      } catch {
        // Silenciar erro - não crítico, apenas para carregar grupos
        setAvailableGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    };

    // Carregar grupos:
    // - No modo create: sempre carregar (sede por padrão)
    // - No modo edit: quando o membro for carregado
    if (mode === 'create') {
      // No modo create, sempre carregar grupos da sede por padrão
      loadGroups();
    } else if (mode === 'edit' && member) {
      // No modo edit, carregar quando membro estiver carregado
      loadGroups();
    }
  }, [selectedCongregationId, mode, member]);

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
      if (member.birth) setBirthDisplay(formatDateFromISO(member.birth));
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

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCEP(value);
    setCepDisplay(formatted);
    const cleanCEP = value.replace(/\D/g, '');
    setValue('cep', cleanCEP);

    // Consultar CEP quando tiver 8 dígitos
    if (cleanCEP.length === 8 && validateCEP(cleanCEP)) {
      setLoadingCEP(true);
      try {
        const cepData = await fetchCEPData(cleanCEP);
        if (cepData) {
          // ACHADO 11: preencher apenas campos que estiverem vazios — não sobrescrever
          // seleções manuais do usuário (ex.: usuário escolheu Estado/Cidade antes de digitar CEP)
          if (cepData.logradouro && !watch('address')) {
            setValue('address', cepData.logradouro);
          }
          if (cepData.bairro && !watch('neighborhood')) {
            setValue('neighborhood', cepData.bairro);
          }
          if (cepData.localidade && !watch('city')) {
            setValue('city', cepData.localidade);
          }
          if (cepData.uf && !watch('state')) {
            setValue('state', cepData.uf);
            const state = states.find(s => s.sigla === cepData.uf);
            if (state) {
              fetchCities(state.id.toString());
            }
          }
        }
      } catch {
        // Silenciar erro - não crítico, CEP é opcional
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'birth' | 'admission_date') => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, '');

    // Limitar a 8 dígitos (DDMMYYYY)
    const limitedNumbers = numbers.slice(0, 8);

    // Aplicar máscara DD/MM/AAAA
    let formatted = '';
    if (limitedNumbers.length <= 2) {
      formatted = limitedNumbers;
    } else if (limitedNumbers.length <= 4) {
      formatted = `${limitedNumbers.slice(0, 2)}/${limitedNumbers.slice(2)}`;
    } else {
      formatted = `${limitedNumbers.slice(0, 2)}/${limitedNumbers.slice(2, 4)}/${limitedNumbers.slice(4, 8)}`;
    }

    // Atualizar display e valor do formulário
    if (field === 'birth') {
      setBirthDisplay(formatted);
      setValue('birth', formatted);
      // Validar formato quando completo (10 caracteres)
      if (formatted.length === 10 && !validateDateFormat(formatted)) {
        setError('birth', {
          type: 'manual',
          message: 'Data de nascimento deve estar no formato DD/MM/YYYY (ex: 05/01/2001)'
        });
      } else if (formatted.length === 10) {
        clearErrors('birth');
      }
    } else if (field === 'admission_date') {
      setAdmissionDateDisplay(formatted);
      setValue('admission_date', formatted);
      // Validar formato quando completo (10 caracteres)
      if (formatted.length === 10 && !validateDateFormat(formatted)) {
        setError('admission_date', {
          type: 'manual',
          message: 'Data de recebimento deve estar no formato DD/MM/YYYY (ex: 05/01/2001)'
        });
      } else if (formatted.length === 10) {
        clearErrors('admission_date');
      }
    }
  };

  const handleFormSubmit = async (data: MemberFormData) => {
    try {
      // Validar nacionalidade: se "Outra" for selecionada, nationality_other deve estar preenchido
      if (data.nationality && data.nationality === 'Outra' && (!data.nationality_other || data.nationality_other.trim() === '')) {
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
      // Converter datas dos filhos também
      const childrenWithISO = children.map(child => ({
        name: child.name,
        birth: child.birth ? formatDateToISO(child.birth) || undefined : undefined,
        dependent: child.dependent,
      }));

      // Lógica para Data de Batismo:
      // Se for "Batismo" ou "Batismo Infantil", copia a Data de Recebimento
      // Caso contrário, envia vazio
      const admissionDateISO = formatDateToISO(data.admission_date) || '';
      let baptismDateISO: string | undefined = undefined;

      if (data.admission === 'Batismo' || data.admission === 'Batismo Infantil') {
        baptismDateISO = admissionDateISO;
      }

      const memberData = {
        ...data,
        birth: formatDateToISO(data.birth) || '',
        baptism_date: baptismDateISO,
        admission_date: admissionDateISO,
        // Tratar nacionalidade: se for "Outra", usar o valor do campo nationality_other; senão usar o valor selecionado
        nationality: data.nationality && data.nationality === 'Outra' ? (data.nationality_other || '') : (data.nationality || ''),
        // Tratar profissão: se for "Outra", usar o valor do campo occupation_other; senão usar o valor selecionado
        occupation: data.occupation === 'Outra' ? (data.occupation_other || '') : data.occupation,
        // Remover campos auxiliares do payload
        nationality_other: undefined,
        occupation_other: undefined,
        // Tratar campos UUID opcionais - enviar null quando vazio
        congregation_id: data.congregation_id || null,
        // Incluir filhos
        children: childrenWithISO,
        // Incluir grupos selecionados (será processado nos modais)
        groups: selectedGroups,
      };

      await onSubmit(memberData);

      // Limpar displays formatados e resetar formulário apenas após sucesso confirmado
      // Só limpar se estiver no modo de criação
      if (mode === 'create') {
        setPhoneDisplay('');
        setWhatsappDisplay('');
        setCepDisplay('');
        setBirthDisplay('');
        setAdmissionDateDisplay('');
        setNationalityOtherError('');
        setOccupationOtherError('');
        setChildren([]);
        setChildrenBirthDisplays({});
        reset();
      }
    } catch (err) {
      // Em caso de erro, não limpar o formulário
      // O erro será tratado pelo componente pai
      // Re-lançar o erro para que o componente pai possa tratá-lo
      throw err;
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
            error={errors.phone?.message}
            isLoading={isLoading}
          />

          <Input
            label="WhatsApp"
            placeholder="(11) 99999-9999"
            value={whatsappDisplay}
            onChange={(e) => handlePhoneChange(e, 'whatsapp')}
            maxLength={15}
            error={errors.whatsapp?.message}
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
            label="Nacionalidade"
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
              label="Especifique a nacionalidade"
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

          {selectedMaritalStatus === 'Casado' && (
            <Input
              label="Cônjuge"
              placeholder="Nome do cônjuge"
              error={errors.spouse?.message}
              isLoading={isLoading}
              {...register('spouse')}
            />
          )}

          <Input
            label="Nome do Pai"
            placeholder="Nome completo do pai"
            error={errors.father_name?.message}
            isLoading={isLoading}
            {...register('father_name')}
          />

          <Input
            label="Nome da Mãe"
            placeholder="Nome completo da mãe"
            error={errors.mother_name?.message}
            isLoading={isLoading}
            {...register('mother_name')}
          />
        </div>
      </div>

      {/* Filhos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <h3 className="text-lg font-medium text-gray-900">
            Filhos
          </h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const newChild: Child = { name: '', birth: '' };
              setChildren([...children, newChild]);
              // Não precisa inicializar o display da data, será vazio por padrão
            }}
            disabled={isLoading}
          >
            Adicionar Filho
          </Button>
        </div>

        {children.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum filho adicionado</p>
        ) : (
          <div className="space-y-4">
            {children.map((child, index) => {
              return (
                <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Filho {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newChildren = children.filter((_, i) => i !== index);
                        setChildren(newChildren);
                        setValue('children', newChildren);
                        // Remover o display da data do filho removido
                        const newDisplays = { ...childrenBirthDisplays };
                        delete newDisplays[index];
                        // Reindexar os displays restantes
                        const reindexedDisplays: Record<number, string> = {};
                        Object.keys(newDisplays).forEach((key) => {
                          const oldIndex = parseInt(key);
                          if (oldIndex > index) {
                            reindexedDisplays[oldIndex - 1] = newDisplays[oldIndex];
                          } else {
                            reindexedDisplays[oldIndex] = newDisplays[oldIndex];
                          }
                        });
                        setChildrenBirthDisplays(reindexedDisplays);
                      }}
                      disabled={isLoading}
                    >
                      Remover
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nome do Filho *"
                      placeholder="Nome completo"
                      value={child.name}
                      onChange={(e) => {
                        const newChildren = [...children];
                        newChildren[index] = { ...child, name: e.target.value };
                        setChildren(newChildren);
                        setValue('children', newChildren);
                      }}
                      isLoading={isLoading}
                    />
                    <div>
                      <Input
                        label="Data de Nascimento"
                        placeholder="DD/MM/AAAA"
                        value={childrenBirthDisplays[index] || ''}
                        onChange={(e) => {
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
                          setChildrenBirthDisplays(prev => ({ ...prev, [index]: formatted }));
                          const newChildren = [...children];
                          newChildren[index] = { ...child, birth: formatted };
                          setChildren(newChildren);
                          setValue('children', newChildren);
                        }}
                        maxLength={10}
                        isLoading={isLoading}
                      />
                      {child.birth && (() => {
                        const childBirthISO = formatDateToISO(child.birth);
                        const childAge = childBirthISO ? calcularIdade(childBirthISO) : null;
                        return childAge !== null ? (
                          <p className="text-xs text-gray-500 mt-1">
                            {childAge} {childAge === 1 ? 'ano' : 'anos'}
                          </p>
                        ) : null;
                      })()}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dependente
                      </label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={child.dependent === true}
                            onChange={(e) => {
                              const newChildren = [...children];
                              newChildren[index] = { ...child, dependent: e.target.checked ? true : undefined };
                              setChildren(newChildren);
                              setValue('children', newChildren);
                            }}
                            disabled={isLoading}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">Sim</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={child.dependent === false}
                            onChange={(e) => {
                              const newChildren = [...children];
                              newChildren[index] = { ...child, dependent: e.target.checked ? false : undefined };
                              setChildren(newChildren);
                              setValue('children', newChildren);
                            }}
                            disabled={isLoading}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">Não</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
            label="Bairro"
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
            label="CEP"
            placeholder="12345-678"
            value={cepDisplay}
            onChange={handleCEPChange}
            maxLength={9}
            error={errors.cep?.message}
            isLoading={isLoading || loadingCEP}
            helperText={loadingCEP ? 'Consultando CEP...' : 'Digite o CEP para preencher automaticamente'}
          />
        </div>
      </div>

      {/* Informações Eclesiásticas */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Informações Eclesiásticas
        </h3>

        {/* Bloco informativo */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md space-y-2">
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>
              Abaixo informe a forma e a data de recebimento na igreja.
            </li>
            <li>
              Para <strong>crianças</strong> que ainda não possuem profissão de fé, selecione a opção abaixo e informe se já foi batizado(a) ou apenas apresentado(a) na igreja.
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primeira linha: Checkbox Membro Infantil */}
          <div className="col-span-2 flex items-center space-x-2">
            <input
              type="checkbox"
              id="isInfantMember"
              className="rounded border-gray-300 text-primary focus:ring-primary/20"
              disabled={isLoading}
              checked={isInfantMember}
              onChange={(e) => {
                setIsInfantMember(e.target.checked);
                // Limpar o valor do tipo de recebimento quando mudar o checkbox
                setValue('admission', '');
              }}
            />
            <label htmlFor="isInfantMember" className="text-sm font-medium text-gray-700">
              Membro Infantil (Criança / Sem Profissão de Fé)
            </label>
          </div>

          {/* Segunda linha: Tipo de Recebimento */}
          <Select
            label="Tipo de Recebimento *"
            value={watch('admission') || ''}
            onChange={(value) => setValue('admission', value)}
            options={isInfantMember ? [
              { value: '', label: 'Selecione o tipo de recebimento' },
              { value: 'Batismo Infantil', label: 'Batismo Infantil' },
              { value: 'Apresentação (sem batismo)', label: 'Apresentação (sem batismo)' }
            ] : [
              { value: '', label: 'Selecione o tipo de recebimento' },
              { value: 'Batismo', label: 'Batismo' },
              { value: 'Transferencia', label: 'Transferência' },
              { value: 'Reconciliação', label: 'Reconciliação' },
              { value: 'Profissão de fé', label: 'Profissão de fé' },
              { value: 'Outro', label: 'Outro' }
            ]}
            disabled={isLoading}
            error={errors.admission?.message}
          />

          {/* Terceira linha: Data de Recebimento */}
          <Input
            label="Data de Recebimento *"
            placeholder="DD/MM/AAAA"
            value={admissionDateDisplay}
            onChange={(e) => handleDateChange(e, 'admission_date')}
            maxLength={10}
            error={errors.admission_date?.message}
            isLoading={isLoading}
          />

          {/* Quarta linha: Informação e campos de Função e Congregação */}
          <div className="col-span-2 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              Abaixo informe se o membro faz parte da igreja sede, ou de alguma congregação/filial.
            </p>
          </div>

          <Select
            label="Congregação"
            value={watch('congregation_id') || ''}
            onChange={(value) => {
              setValue('congregation_id', value);
              // Limpar grupos selecionados quando mudar congregação apenas no modo create
              // No modo edit, os grupos serão filtrados automaticamente
              if (mode === 'create') {
                setSelectedGroups([]);
              }
            }}
            options={[
              { value: '', label: 'Sede' },
              ...congregations.map((congregation) => ({
                value: congregation.id,
                label: congregation.name
              }))
            ]}
            disabled={filtersLoading || isLoading}
          />
        </div>

        {/* Campo de Grupos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grupos / Ministérios
          </label>
          <div className="border border-gray-300 rounded-md p-3 bg-gray-50 max-h-80 overflow-y-auto">
            {loadingGroups ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-gray-500">Carregando grupos...</p>
              </div>
            ) : availableGroups.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-gray-500">
                  Nenhum grupo disponível para esta congregação
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {availableGroups.map((group) => {
                  const isSelected = selectedGroups.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className={`
                        relative flex items-start gap-2 p-3 border rounded-md cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroups([...selectedGroups, group.id]);
                          } else {
                            setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                          }
                        }}
                        disabled={isLoading}
                        className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-gray-500 block truncate">
                            {group.type}
                            {group.congregations && ` • ${group.congregations.name}`}
                          </span>
                          <span className={`text-sm font-medium block truncate ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                            {group.name}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Selecione os grupos aos quais este membro pertence. Os grupos são filtrados pela congregação selecionada.
          </p>
          {selectedGroups.length > 0 && (
            <p className="mt-1 text-xs text-primary font-medium">
              {selectedGroups.length} {selectedGroups.length === 1 ? 'grupo selecionado' : 'grupos selecionados'}
            </p>
          )}
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div 
          ref={errorRef}
          className="p-4 bg-red-50 border border-red-200 rounded-md"
        >
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      )}

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
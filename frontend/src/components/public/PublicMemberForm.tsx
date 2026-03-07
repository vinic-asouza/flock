'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { X } from 'lucide-react';
import { useFiltersData } from '@/hooks/useFiltersData';
import { useIbgeData } from '@/hooks/useIbgeData';
import { useProfessions } from '@/hooks/useProfessions';
import { apiService } from '@/services/api';
import { Group } from '@/types';
import { validateDateFormat } from '@/utils/validations';
import { formatDateToISO } from '@/utils';

// Schema de validação (idêntico ao MemberForm)
const memberSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  whatsapp: z.string().min(10, 'WhatsApp deve ter pelo menos 10 dígitos').optional().or(z.literal('')),
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
  spouse: z.string().optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),
  occupation_other: z.string().optional().or(z.literal('')),
  address: z.string().min(1, 'Endereço é obrigatório'),
  complement: z.string().optional().or(z.literal('')),
  neighborhood: z.string().optional().or(z.literal('')),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(1, 'Estado é obrigatório'),
  cep: z.string().optional().or(z.literal('')),
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
  name: string;
  birth?: string;
  dependent?: boolean;
}

interface PublicMemberFormProps {
  onSubmit: (data: MemberFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  churchName?: string;
  error?: string | null;
}

// Funções auxiliares (idênticas ao MemberForm)
const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
};

const formatCEP = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
};


// formatDateToISO agora é importado de @/utils

const calcularIdade = (birth: string): number | null => {
  if (!birth) return null;
  const birthDate = new Date(birth);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export function PublicMemberForm({
  onSubmit,
  onCancel,
  isLoading = false,
  churchName,
  error
}: PublicMemberFormProps) {
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
  const [children, setChildren] = useState<Child[]>([]);
  const [childrenBirthDisplays, setChildrenBirthDisplays] = useState<Record<number, string>>({});
  const [isInfantMember, setIsInfantMember] = useState(false);
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
    defaultValues: {
      active: true,
      gender: 'Masculino',
      marital_status: 'Solteiro',
      nationality: 'Brasileiro(a)',
      congregation_id: '', // Sede por padrão
    },
  });

  const selectedState = watch('state');
  const selectedNationality = watch('nationality');
  const nationalityOtherValue = watch('nationality_other');
  const selectedOccupation = watch('occupation');
  const occupationOtherValue = watch('occupation_other');
  const selectedMaritalStatus = watch('marital_status');
  const selectedCongregationId = watch('congregation_id');

  // Scroll para o erro quando ele aparecer
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [error]);

  // Carregar grupos disponíveis quando congregação mudar
  useEffect(() => {
    const loadGroups = async () => {
      const congregationIdToUse = selectedCongregationId || null;
      try {
        setLoadingGroups(true);
        // Se congregação vazia ou null, buscar grupos da sede
        const congregationParam = congregationIdToUse === '' || congregationIdToUse === undefined || !congregationIdToUse ? 'sede' : congregationIdToUse;
        const response = await apiService.listGroups({ congregation_id: congregationParam });
        setAvailableGroups(response);
      } catch {
        // Silenciar erro - não crítico, apenas para carregar grupos
        setAvailableGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    };

    // Carregar grupos sempre (sede por padrão quando congregação estiver vazia ou undefined)
    // Isso garante que grupos da sede sejam carregados ao abrir o formulário
    loadGroups();
  }, [selectedCongregationId]);

  // Carregar cidades quando estado mudar
  useEffect(() => {
    if (selectedState) {
      const state = states.find(s => s.sigla === selectedState);
      if (state) {
        fetchCities(state.id.toString());
      }
    }
  }, [selectedState, states, fetchCities]);

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
      if (data.nationality && data.nationality === 'Outra' && (!data.nationality_other || data.nationality_other.trim() === '')) {
        setNationalityOtherError('Por favor, especifique a nacionalidade');
        return;
      } else {
        setNationalityOtherError('');
      }

      if (data.occupation === 'Outra' && (!data.occupation_other || data.occupation_other.trim() === '')) {
        setOccupationOtherError('Por favor, especifique a profissão');
        return;
      } else {
        setOccupationOtherError('');
      }

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
        nationality: data.nationality && data.nationality === 'Outra' ? (data.nationality_other || '') : (data.nationality || ''),
        occupation: data.occupation === 'Outra' ? (data.occupation_other || '') : data.occupation,
        nationality_other: undefined,
        occupation_other: undefined,
        congregation_id: data.congregation_id || null,
        children: childrenWithISO,
        // Incluir grupos selecionados (será processado pelo backend separadamente)
        groups: selectedGroups,
      };

      await onSubmit(memberData);

      // Limpar formulário apenas após sucesso
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
    } catch (err) {
      // Em caso de erro, não limpar o formulário
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
            label="Nome Completo (obrigatório)"
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
            isLoading={isLoading}
          />

          <Input
            label="Data de Nascimento (obrigatório)"
            placeholder="DD/MM/AAAA"
            value={birthDisplay}
            onChange={(e) => handleDateChange(e, 'birth')}
            maxLength={10}
            error={errors.birth?.message}
            isLoading={isLoading}
          />

          <Select
            label="Gênero (obrigatório)"
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
            label="Estado Civil (obrigatório)"
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
              label="Especifique a profissão"
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
            variant="primary"
            size="sm"
            onClick={() => {
              const newChild: Child = { name: '', birth: '' };
              setChildren([...children, newChild]);
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
                        const newDisplays = { ...childrenBirthDisplays };
                        delete newDisplays[index];
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
                      className="flex items-center gap-1"
                    >
                      <X size={16} />
                      Remover
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nome do Filho (obrigatório)"
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
                          let formatted = '';
                          if (numbers.length <= 2) {
                            formatted = numbers;
                          } else if (numbers.length <= 4) {
                            formatted = `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
                          } else {
                            formatted = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
                          }
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
            label="Endereço (obrigatório)"
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
            label="Estado (obrigatório)"
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
            label="Cidade (obrigatório)"
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
            isLoading={isLoading}
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
              Abaixo informe a forma e a data em que você foi recebido na <strong>{churchName || 'igreja'}</strong>.
            </li>
            <li>
              Para <strong>crianças</strong> que ainda não possuem profissão de fé, selecione a opção abaixo e informe se já foi batizado(a) ou apenas apresentado(a) na igreja.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          {/* Primeira linha: Checkbox Membro Infantil */}
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="isInfantMember"
              className="mt-1 rounded border-gray-300 text-primary focus:ring-primary/20 flex-shrink-0"
              disabled={isLoading}
              checked={isInfantMember}
              onChange={(e) => {
                setIsInfantMember(e.target.checked);
                // Limpar o valor do tipo de recebimento quando mudar o checkbox
                setValue('admission', '');
              }}
            />
            <label htmlFor="isInfantMember" className="text-sm font-medium text-gray-700 leading-relaxed">
              Membro Infantil (Criança / Sem Profissão de Fé)
            </label>
          </div>

          {/* Segunda linha: Tipo de Recebimento */}
          <Select
            label="Tipo de Recebimento (obrigatório)"
            value={watch('admission') || ''}
            onChange={(value) => setValue('admission', value)}
            options={isInfantMember ? [
              { value: '', label: 'Selecione o tipo de recebimento' },
              { value: 'Batismo Infantil', label: 'Batismo Infantil' },
              { value: 'Apresentação (sem batismo)', label: 'Apresentação (sem batismo)' }
            ] : [
              { value: '', label: 'Selecione o tipo de recebimento' },
              { value: 'Batismo', label: 'Batismo (se batizou nessa igreja)' },
              { value: 'Transferencia', label: 'Transferência (se batizou em outra igreja)' },
              { value: 'Reconciliação', label: 'Reconciliação' },
              { value: 'Profissão de fé', label: 'Profissão de fé' },
              { value: 'Outro', label: 'Outro' }
            ]}
            disabled={isLoading}
            error={errors.admission?.message}
          />

          {/* Terceira linha: Data de Recebimento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Data de Recebimento (obrigatório)"
              placeholder="DD/MM/AAAA"
              value={admissionDateDisplay}
              onChange={(e) => handleDateChange(e, 'admission_date')}
              maxLength={10}
              error={errors.admission_date?.message}
              isLoading={isLoading}
            />
          </div>

          {/* Bloco informativo */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md space-y-2">
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>
                Se não souber a data exata, pode ser uma data aproximada!
              </li>
            </ul>
          </div>

          {/* Quarta linha: Informação e campos de Função e Congregação */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800 leading-relaxed">
              Abaixo informe se você faz parte da igreja sede <strong>{churchName || 'igreja'}</strong>, ou de alguma <strong>congregação/filial</strong>.
            </p>
          </div>

          <Select
            label="Congregação"
            value={watch('congregation_id') || ''}
            onChange={(value) => {
              setValue('congregation_id', value);
              // Limpar grupos selecionados quando mudar congregação
              setSelectedGroups([]);
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
                    {selectedCongregationId !== undefined ? 'Nenhum grupo disponível para esta congregação' : 'Nenhum grupo disponível'}
                  </p>
                </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {availableGroups.map((group) => {
                  const isSelected = selectedGroups.includes(group.id);
                  // Congregação sempre está disponível (sede por padrão quando vazio)
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
              Selecione os grupos aos quais você pertence. Os grupos são filtrados pela congregação selecionada.
            </p>
            {selectedGroups.length > 0 && (
              <p className="mt-1 text-xs text-primary font-medium">
                {selectedGroups.length} {selectedGroups.length === 1 ? 'grupo selecionado' : 'grupos selecionados'}
              </p>
            )}
          </div>
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
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isLoading}
        >
          Enviar Cadastro
        </Button>
      </div>
    </form>
  );
}


'use client';

import { useState, useEffect } from 'react';
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

// Schema de validação (idêntico ao MemberForm)
const memberSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  whatsapp: z.string().min(10, 'WhatsApp deve ter pelo menos 10 dígitos').optional().or(z.literal('')),
  birth: z.string().min(1, 'Data de nascimento é obrigatória'),
  gender: z.enum(['Masculino', 'Feminino']),
  marital_status: z.enum(['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro']),
  nationality: z.string().min(1, 'Nacionalidade é obrigatória'),
  nationality_other: z.string().optional().or(z.literal('')),
  document: z.string()
    .optional()
    .or(z.literal(''))
    .refine((cpf) => {
      if (!cpf || cpf.trim() === '') return true;
      const cleanCpf = cpf.replace(/\D/g, '');
      if (cleanCpf.length !== 11) return false;
      if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanCpf[i]) * (10 - i);
      }
      let remainder = sum % 11;
      const firstDigit = remainder < 2 ? 0 : 11 - remainder;
      if (parseInt(cleanCpf[9]) !== firstDigit) return false;
      sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanCpf[i]) * (11 - i);
      }
      remainder = sum % 11;
      const secondDigit = remainder < 2 ? 0 : 11 - remainder;
      return parseInt(cleanCpf[10]) === secondDigit;
    }, 'CPF inválido'),
  spouse: z.string().optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),
  occupation_other: z.string().optional().or(z.literal('')),
  address: z.string().min(1, 'Endereço é obrigatório'),
  complement: z.string().optional().or(z.literal('')),
  neighborhood: z.string().optional().or(z.literal('')),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(1, 'Estado é obrigatório'),
  cep: z.string().optional().or(z.literal('')),
  baptism_date: z.string().optional().or(z.literal('')),
  admission: z.string().min(1, 'Tipo de recebimento é obrigatório'),
  admission_date: z.string().min(1, 'Data de recebimento é obrigatória'),
  role_id: z.string().optional().or(z.literal('')).nullable(),
  congregation_id: z.string().optional().or(z.literal('')).nullable(),
  father_name: z.string().optional().or(z.literal('')),
  mother_name: z.string().optional().or(z.literal('')),
  children: z.array(z.object({
    name: z.string().min(1, 'Nome do filho é obrigatório'),
    birth: z.string().optional().or(z.literal('')),
  })).optional(),
  active: z.boolean(),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface Child {
  name: string;
  birth?: string;
}

interface PublicMemberFormProps {
  onSubmit: (data: MemberFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  churchName?: string;
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

// Função de formatação de CPF - temporariamente desabilitada
// const formatCPF = (value: string): string => {
//   const numbers = value.replace(/\D/g, '');
//   if (numbers.length <= 3) {
//     return numbers;
//   } else if (numbers.length <= 6) {
//     return numbers.replace(/(\d{3})(\d{1,3})/, '$1.$2');
//   } else if (numbers.length <= 9) {
//     return numbers.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
//   } else {
//     return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
//   }
// };

const formatDateToISO = (formattedDate: string): string | null => {
  if (!formattedDate) return null;
  const parts = formattedDate.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

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
  churchName
}: PublicMemberFormProps) {
  const { roles, congregations, loading: filtersLoading } = useFiltersData();
  const { states, cities, loadingCities, fetchCities } = useIbgeData();
  const { professions, loading: professionsLoading } = useProfessions();

  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [whatsappDisplay, setWhatsappDisplay] = useState('');
  const [cepDisplay, setCepDisplay] = useState('');
  const [birthDisplay, setBirthDisplay] = useState('');
  const [baptismDateDisplay, setBaptismDateDisplay] = useState('');
  const [admissionDateDisplay, setAdmissionDateDisplay] = useState('');
  // const [cpfDisplay, setCpfDisplay] = useState(''); // Temporariamente desabilitado
  const [nationalityOtherError, setNationalityOtherError] = useState('');
  const [occupationOtherError, setOccupationOtherError] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [childrenBirthDisplays, setChildrenBirthDisplays] = useState<Record<number, string>>({});
  const [isInfantMember, setIsInfantMember] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      active: true,
      gender: 'Masculino',
      marital_status: 'Solteiro',
    },
  });

  const selectedState = watch('state');
  const selectedNationality = watch('nationality');
  const nationalityOtherValue = watch('nationality_other');
  const selectedOccupation = watch('occupation');
  const occupationOtherValue = watch('occupation_other');
  const selectedMaritalStatus = watch('marital_status');

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

  // Função de formatação de CPF - temporariamente desabilitada
  // const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const value = e.target.value;
  //   const formatted = formatCPF(value);
  //   setCpfDisplay(formatted);
  //   setValue('document', value.replace(/\D/g, ''));
  // };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'birth' | 'baptism_date' | 'admission_date') => {
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
      if (data.nationality === 'Outra' && (!data.nationality_other || data.nationality_other.trim() === '')) {
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
      }));

      const memberData = {
        ...data,
        birth: formatDateToISO(data.birth) || '',
        baptism_date: data.baptism_date ? formatDateToISO(data.baptism_date) || undefined : undefined,
        admission_date: formatDateToISO(data.admission_date) || '',
        nationality: data.nationality === 'Outra' ? (data.nationality_other || '') : data.nationality,
        occupation: data.occupation === 'Outra' ? (data.occupation_other || '') : data.occupation,
        nationality_other: undefined,
        occupation_other: undefined,
        role_id: data.role_id || null,
        congregation_id: data.congregation_id || null,
        children: childrenWithISO,
      };

      await onSubmit(memberData);

      // Limpar formulário após sucesso
      setPhoneDisplay('');
      setWhatsappDisplay('');
      setCepDisplay('');
      // setCpfDisplay(''); // Temporariamente desabilitado
      setBirthDisplay('');
      setBaptismDateDisplay('');
      setAdmissionDateDisplay('');
      setNationalityOtherError('');
      setOccupationOtherError('');
      setChildren([]);
      setChildrenBirthDisplays({});
      reset();
    } catch (error) {
      throw error;
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
            label="Nome Completo"
            placeholder="Digite o nome completo"
            error={errors.name?.message}
            isLoading={isLoading}
            {...register('name')}
          />

          <Input
            label="Email (opcional)"
            type="email"
            placeholder="email@exemplo.com"
            error={errors.email?.message}
            isLoading={isLoading}
            {...register('email')}
          />

          <Input
            label="Telefone (opcional)"
            placeholder="(11) 99999-9999"
            value={phoneDisplay}
            onChange={(e) => handlePhoneChange(e, 'phone')}
            maxLength={15}
            error={errors.phone?.message}
            isLoading={isLoading}
          />

          <Input
            label="WhatsApp (opcional)"
            placeholder="(11) 99999-9999"
            value={whatsappDisplay}
            onChange={(e) => handlePhoneChange(e, 'whatsapp')}
            maxLength={15}
            isLoading={isLoading}
          />

          <Input
            label="Data de Nascimento"
            placeholder="DD/MM/AAAA"
            value={birthDisplay}
            onChange={(e) => handleDateChange(e, 'birth')}
            maxLength={10}
            error={errors.birth?.message}
            isLoading={isLoading}
          />

          <Select
            label="Gênero"
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
            label="Estado Civil"
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
            label="Profissão (opcional)"
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

          {/* <Input
            label="CPF (opcional)"
            placeholder="000.000.000-00"
            value={cpfDisplay}
            onChange={handleCPFChange}
            maxLength={14}
            error={errors.document?.message}
            isLoading={isLoading}
          /> */}

          {selectedMaritalStatus === 'Casado' && (
            <Input
              label="Cônjuge (opcional)"
              placeholder="Nome do cônjuge"
              error={errors.spouse?.message}
              isLoading={isLoading}
              {...register('spouse')}
            />
          )}

          <Input
            label="Nome do Pai (opcional)"
            placeholder="Nome completo do pai"
            error={errors.father_name?.message}
            isLoading={isLoading}
            {...register('father_name')}
          />

          <Input
            label="Nome da Mãe (opcional)"
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
            label="Endereço"
            placeholder="Rua das Flores, 123"
            error={errors.address?.message}
            isLoading={isLoading}
            {...register('address')}
          />

          <Input
            label="Complemento (opcional)"
            placeholder="Apartamento, bloco, etc."
            error={errors.complement?.message}
            isLoading={isLoading}
            {...register('complement')}
          />

          <Input
            label="Bairro (opcional)"
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
            searchable={true}
            error={errors.state?.message}
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
            searchable={true}
            error={errors.city?.message}
          />

          <Input
            label="CEP (opcional)"
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
          <p className="text-sm text-blue-800">
            <strong>Orientações importantes:</strong>
          </p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>
              Se você se batizou na <strong>{churchName || 'igreja'}</strong>, a <strong>Data de Batismo</strong> e <strong>Data de Recebimento</strong> devem ser iguais.
            </li>
            <li>
              Se você se batizou em outra igreja, insira a data em que você se batizou em <strong>Data de Batismo</strong>, e insira a data que você foi recebido na {churchName || 'igreja'} em <strong>Data de Recebimento</strong>.
            </li>
            <li>
              Se não souber as datas exatas pode ser a data aproximada!
            </li>
            <li>
              Para crianças, selecione a opção abaixo e informe se já foi batizado(a) ou apenas apresentado(a) na igreja.
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
            label="Tipo de Recebimento"
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

          {/* Terceira linha: Data de Batismo e Data de Recebimento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {watch('admission') !== 'Apresentação (sem batismo)' && (
              <Input
                label="Data de Batismo (opcional)"
                placeholder="DD/MM/AAAA"
                value={baptismDateDisplay}
                onChange={(e) => handleDateChange(e, 'baptism_date')}
                maxLength={10}
                isLoading={isLoading}
              />
            )}

            <Input
              label="Data de Recebimento"
              placeholder="DD/MM/AAAA"
              value={admissionDateDisplay}
              onChange={(e) => handleDateChange(e, 'admission_date')}
              maxLength={10}
              error={errors.admission_date?.message}
              isLoading={isLoading}
            />
          </div>

          {/* Quarta linha: Informação e campos de Função e Congregação */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800 leading-relaxed">
              Abaixo informe se você faz parte da igreja sede <strong>{churchName || 'igreja'}</strong>, ou de alguma <strong>congregação/filial</strong>, informe também se você possui algum <strong>cargo</strong> ou faz parte de um <strong>ministério</strong> específico.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Congregação"
              value={watch('congregation_id') || ''}
              onChange={(value) => setValue('congregation_id', value)}
              options={[
                { value: '', label: 'Sede' },
                ...congregations.map((congregation) => ({
                  value: congregation.id,
                  label: congregation.name
                }))
              ]}
              disabled={filtersLoading || isLoading}
            />

            <Select
              label="Cargo ou Ministério (opcional)"
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
          </div>
        </div>
      </div>

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


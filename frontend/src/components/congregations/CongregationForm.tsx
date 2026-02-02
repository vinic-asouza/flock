'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useIbgeData } from '@/hooks/useIbgeData';

// Regex para validar telefone brasileiro
const phoneRegex = /^[\d\s\(\)\-]{10,15}$/;

// Função para criar schema de validação (permite acesso às cidades do estado)
const createCongregationSchema = (cities: Array<{ nome: string }> = []) => z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode ter mais de 100 caracteres'),
  address: z.string()
    .min(5, 'Endereço deve ter pelo menos 5 caracteres')
    .max(255, 'Endereço não pode ter mais de 255 caracteres'),
  city: z.string()
    .min(2, 'Cidade é obrigatória')
    .max(100, 'Cidade não pode ter mais de 100 caracteres')
    .refine((val: string) => {
      if (!val || val.trim() === '') return false;
      // Se temos lista de cidades, validar que a cidade pertence ao estado
      if (cities.length > 0) {
        return cities.some(city => city.nome === val);
      }
      return true; // Se não temos cidades carregadas ainda, aceitar
    }, {
      message: 'A cidade selecionada não pertence ao estado escolhido'
    }),
  state: z.string()
    .length(2, 'Estado deve ser uma sigla de 2 caracteres (ex: SP, RJ)'),
  leader: z.string()
    .max(100, 'Nome do líder não pode ter mais de 100 caracteres')
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .max(20, 'Telefone não pode ter mais de 20 caracteres')
    .optional()
    .or(z.literal(''))
    .refine((val: string | undefined) => {
      if (!val || val.trim() === '') return true; // Opcional
      // Remover formatação para validar apenas números
      const numbersOnly = val.replace(/\D/g, '');
      return numbersOnly.length >= 10 && numbersOnly.length <= 11 && phoneRegex.test(val);
    }, {
      message: 'Telefone inválido. Deve conter 10 ou 11 dígitos (com ou sem formatação)'
    }),
});

type CongregationFormData = z.infer<ReturnType<typeof createCongregationSchema>>;

interface Congregation {
  id: string;
  church_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  leader?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

interface CongregationFormProps {
  congregation?: Congregation | null;
  onSubmit: (data: CongregationFormData) => Promise<void>;
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

export function CongregationForm({ congregation, onSubmit, onCancel, isLoading = false, mode }: CongregationFormProps) {
  const { states, cities, loadingCities, fetchCities } = useIbgeData();

  const [phoneDisplay, setPhoneDisplay] = useState('');

  // Criar schema dinamicamente com acesso às cidades do estado selecionado
  const dynamicSchema = useMemo(() => createCongregationSchema(cities || []), [cities]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CongregationFormData>({
    resolver: zodResolver(dynamicSchema),
    mode: 'onChange', // Validar enquanto o usuário digita
    defaultValues: mode === 'create' ? {} : {
      // Para modo edit, deixar vazio e usar reset
    },
  });

  const selectedState = watch('state');

  // Resetar formulário quando congregation mudar (para modo edit)
  useEffect(() => {
    if (congregation && mode === 'edit') {
      setValue('name', congregation.name);
      setValue('address', congregation.address);
      setValue('city', congregation.city);
      setValue('state', congregation.state);
      setValue('leader', congregation.leader || '');
      setValue('phone', congregation.phone || '');
      
      // Formulário pronto
    } else if (mode === 'create') {
      // Formulário pronto
    }
  }, [congregation, mode, setValue]);

  // Carregar cidades quando estado mudar
  useEffect(() => {
    if (selectedState) {
      const state = states.find(s => s.sigla === selectedState);
      if (state) {
        fetchCities(state.id.toString());
      }
    }
  }, [selectedState, states, fetchCities]);

  // Carregar cidades quando congregation for carregado no modo edit
  useEffect(() => {
    if (congregation && mode === 'edit' && congregation.state && states.length > 0) {
      const state = states.find(s => s.sigla === congregation.state);
      if (state) {
        fetchCities(state.id.toString());
      }
    }
  }, [congregation, mode, states, fetchCities]);

  // Inicializar display formatado
  useEffect(() => {
    if (congregation && congregation.phone) {
      setPhoneDisplay(formatPhone(congregation.phone));
    }
  }, [congregation]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPhone(value);
    setPhoneDisplay(formatted);
    setValue('phone', value.replace(/\D/g, ''));
  };

  const handleFormSubmit = async (data: CongregationFormData) => {
    try {
      await onSubmit(data);

      // Limpar displays formatados após sucesso
      setPhoneDisplay('');
      reset();
    } catch {
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
            label="Nome da Congregação *"
            placeholder="Digite o nome da congregação"
            error={errors.name?.message}
            isLoading={isLoading}
            disabled={isLoading}
            maxLength={100}
            {...register('name')}
          />

          <Input
            label="Líder"
            placeholder="Nome do líder da congregação"
            error={errors.leader?.message}
            isLoading={isLoading}
            disabled={isLoading}
            maxLength={100}
            {...register('leader')}
          />
        </div>
      </div>

      {/* Localização */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
          Localização
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Endereço *"
            placeholder="Rua, número, bairro"
            error={errors.address?.message}
            isLoading={isLoading}
            disabled={isLoading}
            maxLength={255}
            {...register('address')}
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
            error={errors.state?.message}
            searchable={true}
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
            error={errors.city?.message}
            searchable={true}
          />

          <Input
            label="Telefone"
            placeholder="(11) 99999-9999"
            value={phoneDisplay}
            onChange={handlePhoneChange}
            maxLength={20}
            isLoading={isLoading}
            disabled={isLoading}
            error={errors.phone?.message as string | undefined}
          />
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
          {mode === 'create' ? 'Criar Congregação' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  );
}

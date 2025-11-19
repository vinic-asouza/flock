'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useIbgeData } from '@/hooks/useIbgeData';

// Schema de validação
const congregationSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  city: z.string().min(2, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório'),
  leader: z.string().optional().or(z.literal('')),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos').optional().or(z.literal('')),
});

type CongregationFormData = z.infer<typeof congregationSchema>;

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
  // const [formReady, setFormReady] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CongregationFormData>({
    resolver: zodResolver(congregationSchema),
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
            {...register('name')}
          />

          <Input
            label="Líder"
            placeholder="Nome do líder da congregação"
            error={errors.leader?.message}
            isLoading={isLoading}
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
            maxLength={15}
            isLoading={isLoading}
            error={errors.phone?.message}
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

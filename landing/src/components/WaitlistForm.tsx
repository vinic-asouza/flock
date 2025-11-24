'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader } from 'lucide-react';
import { waitlistService } from '@/services/waitlist';
import toast from 'react-hot-toast';
import { useIbgeData } from '@/hooks/useIbgeData';

const waitlistSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string()
    .min(10, 'Telefone deve ter pelo menos 10 dígitos')
    .max(11, 'Telefone deve ter no máximo 11 dígitos')
    .regex(/^\d+$/, 'Telefone deve conter apenas números'),
  churchName: z.string().min(2, 'Nome da igreja deve ter pelo menos 2 caracteres'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().length(2, 'Estado deve ter 2 caracteres'),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

// Função para formatar telefone
const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
};

interface WaitlistFormProps {
  onSubmit?: (data: WaitlistFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function WaitlistForm({ onSubmit, onCancel, isLoading: externalLoading }: WaitlistFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const { states, cities, loadingStates, loadingCities, fetchCities } = useIbgeData();
  const [selectedStateId, setSelectedStateId] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
  });

  const watchedState = watch('state');

  // Buscar cidades quando o estado mudar
  useEffect(() => {
    if (watchedState) {
      const state = states.find(s => s.sigla === watchedState);
      if (state) {
        setSelectedStateId(state.id.toString());
        fetchCities(state.id.toString());
        // Limpar cidade quando mudar o estado
        setValue('city', '');
      }
    } else {
      setSelectedStateId('');
      setValue('city', '');
    }
  }, [watchedState, states, fetchCities, setValue]);

  // Aplicar máscara de telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneValue(formatted);
    // Salvar apenas números no formulário
    const numbers = formatted.replace(/\D/g, '');
    setValue('phone', numbers, { shouldValidate: true });
  };

  const internalOnSubmit = async (data: WaitlistFormData) => {
    try {
      setIsSubmitting(true);
      
      if (onSubmit) {
        await onSubmit(data);
      } else {
        await waitlistService.subscribe(data);
        toast.success('Cadastro realizado com sucesso!');
        reset();
        setPhoneValue('');
        setSelectedStateId('');
        setValue('city', '');
      }
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao realizar cadastro. Tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = externalLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit(internalOnSubmit)} className="space-y-4 p-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Nome Completo *
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Seu nome completo"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="seu@email.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Telefone *
        </label>
        <input
          id="phone"
          type="tel"
          value={phoneValue}
          onChange={handlePhoneChange}
          maxLength={15}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="(11) 99999-9999"
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="churchName" className="block text-sm font-medium text-gray-700 mb-1">
          Nome da Igreja *
        </label>
        <input
          id="churchName"
          type="text"
          {...register('churchName')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Nome da sua igreja"
        />
        {errors.churchName && (
          <p className="mt-1 text-sm text-red-600">{errors.churchName.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
            Estado *
          </label>
          <select
            id="state"
            {...register('state')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={loadingStates}
          >
            <option value="">Selecione um estado</option>
            {states.map((state) => (
              <option key={state.id} value={state.sigla}>
                {state.nome}
              </option>
            ))}
          </select>
          {loadingStates && (
            <p className="mt-1 text-sm text-gray-500">Carregando estados...</p>
          )}
          {errors.state && (
            <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            Cidade *
          </label>
          <select
            id="city"
            {...register('city')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={!watchedState || loadingCities}
          >
            <option value="">Selecione uma cidade</option>
            {cities.map((city) => (
              <option key={city.id} value={city.nome}>
                {city.nome}
              </option>
            ))}
          </select>
          {!watchedState && (
            <p className="mt-1 text-sm text-gray-500">Selecione um estado primeiro</p>
          )}
          {loadingCities && (
            <p className="mt-1 text-sm text-gray-500">Carregando cidades...</p>
          )}
          {errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className={`${onCancel ? 'flex-1' : 'w-full'} bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
        >
          {isLoading ? (
            <>
              <Loader className="animate-spin" size={20} />
              Cadastrando...
            </>
          ) : (
            'Entrar na Lista de Espera'
          )}
        </button>
      </div>
    </form>
  );
}

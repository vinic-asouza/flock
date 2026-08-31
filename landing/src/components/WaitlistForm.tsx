'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader, ArrowRight, CheckCircle2, ArrowLeft, Mail } from 'lucide-react';
import { waitlistService } from '@/services/waitlist';
import toast from 'react-hot-toast';
import { readPlanFromLocation, parseWaitlistPlanParam } from '@/utils/waitlistPlan';
import { PLAN_DISPLAY_NAMES } from '@/utils/planFunnel';
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
  plan: z.enum(['200', '500', '800', 'personalizado'], {
    errorMap: () => ({ message: 'Selecione um plano válido' }),
  }),
  message: z.string().optional(),
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
  isLoading?: boolean;
  initialPlan?: string;
}

export function WaitlistForm({ onSubmit, isLoading: externalLoading, initialPlan }: WaitlistFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const { states, cities, loadingStates, loadingCities, errorStates, errorCities, fetchCities } = useIbgeData();
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

  useEffect(() => {
    const applyPlanFromUrl = () => {
      const planValue =
        parseWaitlistPlanParam(initialPlan) ?? readPlanFromLocation();
      if (planValue) {
        setValue('plan', planValue, { shouldValidate: true });
      }

      if (typeof window !== 'undefined' && window.location.hash.includes('?')) {
        const newHash = window.location.hash.split('?')[0];
        window.history.replaceState(null, '', newHash || window.location.pathname + window.location.search);
      }
    };

    applyPlanFromUrl();
    window.addEventListener('hashchange', applyPlanFromUrl);
    return () => window.removeEventListener('hashchange', applyPlanFromUrl);
  }, [setValue, initialPlan]);

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
        setIsSubmitted(true);
      } else {
        await waitlistService.subscribe({
          ...data,
          email: data.email.trim().toLowerCase(),
        });
        setIsSubmitted(true);
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

  const handleBackToForm = () => {
    setIsSubmitted(false);
    reset();
    setPhoneValue('');
    setSelectedStateId('');
    setValue('city', '');
  };

  const isLoading = externalLoading || isSubmitting;

  const fieldClass =
    'w-full min-h-11 h-11 md:h-10 md:min-h-10 text-base px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  const planOptions = [
    { value: '200' as const, label: PLAN_DISPLAY_NAMES['200'], description: 'Até 200 membros' },
    { value: '500' as const, label: PLAN_DISPLAY_NAMES['500'], description: 'Até 500 membros' },
    { value: '800' as const, label: PLAN_DISPLAY_NAMES['800'], description: 'Até 800 membros' },
    { value: 'personalizado' as const, label: 'Personalizado', description: 'Mais de 800 membros' },
  ];

  // Mensagem de sucesso
  if (isSubmitted) {
    return (
      <div className="text-center py-8 px-4">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900">
              Solicitação Enviada com Sucesso!
            </h3>
            <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
              Obrigado pelo contato. Nossa equipe retornará em breve. Se receber um e-mail de confirmação, guarde-o como comprovante do envio.
            </p>
          </div>
          <button
            type="button"
            onClick={handleBackToForm}
            className="mt-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors duration-200 underline underline-offset-2"
          >
            <ArrowLeft size={16} />
            Voltar para o formulário
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(internalOnSubmit)} className="space-y-3 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="name" className={labelClass}>
            Nome Completo *
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className={fieldClass}
            placeholder="Seu nome completo"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="churchName" className={labelClass}>
            Nome da Igreja *
          </label>
          <input
            id="churchName"
            type="text"
            {...register('churchName')}
            className={fieldClass}
            placeholder="Nome da sua igreja"
          />
          {errors.churchName && (
            <p className="mt-1 text-xs text-red-600">{errors.churchName.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email *
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className={fieldClass}
            placeholder="seu@email.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>
            Contato *
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phoneValue}
            onChange={handlePhoneChange}
            maxLength={15}
            className={fieldClass}
            placeholder="(11) 99999-9999"
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="state" className={labelClass}>
            Estado *
          </label>
          <select
            id="state"
            {...register('state')}
            className={fieldClass}
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
            <p className="mt-1 text-xs text-gray-500">Carregando estados...</p>
          )}
          {errorStates && !loadingStates && (
            <p className="mt-1 text-xs text-amber-700">
              Não foi possível carregar estados pela API do IBGE. Usando lista padrão de UFs.
            </p>
          )}
          {errors.state && (
            <p className="mt-1 text-xs text-red-600">{errors.state.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="city" className={labelClass}>
            Cidade *
          </label>
          <select
            id="city"
            {...register('city')}
            className={fieldClass}
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
            <p className="mt-1 text-xs text-gray-500">Selecione um estado primeiro</p>
          )}
          {loadingCities && (
            <p className="mt-1 text-xs text-gray-500">Carregando cidades...</p>
          )}
          {errorCities && watchedState && !loadingCities && (
            <p className="mt-1 text-xs text-amber-700">
              Não foi possível carregar cidades. Tente selecionar o estado novamente.
            </p>
          )}
          {errors.city && (
            <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(10.5rem,13rem)_1fr] gap-3 items-stretch">
        <div>
          <p className={labelClass}>Plano de Interesse *</p>
          <div className="flex flex-col gap-1.5" role="group" aria-label="Plano de interesse">
            {planOptions.map((plan) => {
              const isSelected = watch('plan') === plan.value;
              return (
                <button
                  key={plan.value}
                  type="button"
                  onClick={() => setValue('plan', plan.value, { shouldValidate: true })}
                  className={`
                    relative min-h-11 md:min-h-9 px-2.5 py-1.5 rounded-lg border text-left transition-all duration-200
                    ${isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 bg-white hover:border-primary/50'
                    }
                    ${errors.plan ? 'border-red-300' : ''}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`
                        w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0
                        ${isSelected ? 'border-primary bg-primary' : 'border-gray-300 bg-white'}
                      `}
                    >
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className={`font-semibold text-sm leading-tight ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                        {plan.label}
                      </div>
                      <div className="text-[11px] text-gray-500 leading-tight">
                        {plan.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {errors.plan && (
            <p className="mt-1 text-xs text-red-600">{errors.plan.message}</p>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <label htmlFor="message" className={labelClass}>
            Mensagem
          </label>
          <textarea
            id="message"
            {...register('message')}
            rows={5}
            className={`${fieldClass} h-full min-h-[8.5rem] md:min-h-0 resize-none`}
            placeholder="Deixe uma mensagem adicional (opcional)"
          />
          {errors.message && (
            <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>
          )}
        </div>
      </div>

      <div className="pt-1">
        <button
          type="submit"
          disabled={isLoading || (errorStates !== null && states.length === 0)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="group w-full bg-primary text-white px-6 py-2.5 min-h-11 rounded-lg text-sm sm:text-base font-semibold hover:bg-[#0d0a3a] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl sm:hover:scale-105 relative overflow-hidden"
        >
          {isLoading ? (
            <>
              <Loader className="animate-spin" size={18} />
              Enviando...
            </>
          ) : (
            <>
              <Mail size={18} className="relative z-10" />
              <span className="relative z-10">Enviar mensagem</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-[#0d0a3a] to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

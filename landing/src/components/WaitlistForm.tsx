'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as m from 'motion/react-m';
import { Loader, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { waitlistService } from '@/services/waitlist';
import toast from 'react-hot-toast';
import { readPlanFromLocation, parseWaitlistPlanParam, type WaitlistPlanId } from '@/utils/waitlistPlan';
import { isClosedLaunch } from '@/utils/launchMode';
import { WAITLIST_DEMO_EVENT, WAITLIST_PLAN_EVENT } from '@/utils/landingScroll';
import { PLAN_DISPLAY_NAMES } from '@/utils/planFunnel';
import { useIbgeData } from '@/hooks/useIbgeData';
import { cn } from '@/utils/cn';

const DEMO_MESSAGE = 'Gostaria de agendar uma demonstração do Flock.';

const waitlistSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string({ required_error: 'Telefone é obrigatório' })
    .min(10, 'Telefone deve ter pelo menos 10 dígitos')
    .max(11, 'Telefone deve ter no máximo 11 dígitos')
    .regex(/^\d+$/, 'Telefone deve conter apenas números'),
  churchName: z.string().min(2, 'Nome da igreja deve ter pelo menos 2 caracteres'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().length(2, 'Selecione um estado'),
  plan: z.enum(['100', '200', '500', '800', 'personalizado'], {
    errorMap: () => ({ message: 'Selecione um plano' }),
  }),
  message: z.string().optional(),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
};

const inputClass =
  'w-full min-h-11 rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 py-2.5 text-base text-gray-900 transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent-500/15 disabled:cursor-not-allowed disabled:bg-gray-100 aria-[invalid=true]:border-red-300 aria-[invalid=true]:focus:ring-red-500/15';

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error ? (
        <m.p
          id={`${id}-error`}
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 text-xs text-red-600"
        >
          {error}
        </m.p>
      ) : (
        hint
      )}
    </div>
  );
}

const BURST = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  return { dx: Math.cos(angle) * 64, dy: Math.sin(angle) * 64, color: i % 2 ? '#5346f0' : '#a99ffb' };
});

interface WaitlistFormProps {
  onSubmit?: (data: WaitlistFormData) => Promise<void>;
  isLoading?: boolean;
  initialPlan?: string;
}

export function WaitlistForm({ onSubmit, isLoading: externalLoading, initialPlan }: WaitlistFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const { states, cities, loadingStates, loadingCities, errorStates, errorCities, fetchCities } = useIbgeData();
  const closed = isClosedLaunch();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    getValues,
    watch,
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    mode: 'onTouched',
  });

  const watchedState = watch('state');
  const selectedPlan = watch('plan');

  useEffect(() => {
    const allowFree = isClosedLaunch();

    const applyPlan = (planValue: WaitlistPlanId | null) => {
      if (!planValue) return;
      setValue('plan', planValue, { shouldValidate: true });
    };

    const applyPlanFromUrl = () => {
      applyPlan(
        parseWaitlistPlanParam(initialPlan, { allowFree }) ??
          readPlanFromLocation(undefined, undefined, { allowFree })
      );

      if (typeof window !== 'undefined' && window.location.hash.includes('?')) {
        const newHash = window.location.hash.split('?')[0];
        window.history.replaceState(null, '', newHash || window.location.pathname + window.location.search);
      }
    };

    const onPlanEvent = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      applyPlan(parseWaitlistPlanParam(detail, { allowFree }));
    };

    const onDemoEvent = () => {
      if (!getValues('message')?.trim()) setValue('message', DEMO_MESSAGE);
    };

    applyPlanFromUrl();
    window.addEventListener('hashchange', applyPlanFromUrl);
    window.addEventListener(WAITLIST_PLAN_EVENT, onPlanEvent);
    window.addEventListener(WAITLIST_DEMO_EVENT, onDemoEvent);
    return () => {
      window.removeEventListener('hashchange', applyPlanFromUrl);
      window.removeEventListener(WAITLIST_PLAN_EVENT, onPlanEvent);
      window.removeEventListener(WAITLIST_DEMO_EVENT, onDemoEvent);
    };
  }, [setValue, getValues, initialPlan]);

  useEffect(() => {
    if (watchedState) {
      const state = states.find((s) => s.sigla === watchedState);
      if (state) {
        fetchCities(state.id.toString());
        setValue('city', '');
      }
    } else {
      setValue('city', '');
    }
  }, [watchedState, states, fetchCities, setValue]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneValue(formatted);
    const numbers = formatted.replace(/\D/g, '');
    setValue('phone', numbers, { shouldValidate: Boolean(errors.phone) || numbers.length >= 10 });
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
    setValue('city', '');
  };

  const isLoading = externalLoading || isSubmitting;

  const planOptions = [
    ...(closed
      ? [{ value: '100' as const, label: PLAN_DISPLAY_NAMES['100'], description: 'Até 100 membros' }]
      : []),
    { value: '200' as const, label: PLAN_DISPLAY_NAMES['200'], description: 'Até 200 membros' },
    { value: '500' as const, label: PLAN_DISPLAY_NAMES['500'], description: 'Até 500 membros' },
    { value: '800' as const, label: PLAN_DISPLAY_NAMES['800'], description: 'Até 800 membros' },
    { value: 'personalizado' as const, label: 'Personalizado', description: 'Mais de 800 membros' },
  ];

  if (isSubmitted) {
    return (
      <m.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="px-2 py-10 text-center"
        role="status"
      >
        <div className="relative mx-auto mb-6 h-20 w-20">
          {BURST.map((dot, i) => (
            <span
              key={i}
              aria-hidden
              className="burst-dot absolute top-1/2 left-1/2 -mt-1 -ml-1 h-2 w-2 rounded-full"
              style={{ backgroundColor: dot.color, ['--dx' as string]: `${dot.dx}px`, ['--dy' as string]: `${dot.dy}px` }}
            />
          ))}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
            <svg aria-hidden viewBox="0 0 24 24" className="h-10 w-10 text-emerald-600">
              <path className="check-draw" d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900">Solicitação enviada com sucesso!</h3>
        <p className="mx-auto mt-2 max-w-md leading-relaxed text-gray-600">
          Obrigado pelo contato. Nossa equipe retornará em breve. Se receber um e-mail de confirmação, guarde-o como comprovante do envio.
        </p>
        <button
          type="button"
          onClick={handleBackToForm}
          className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm text-gray-600 underline underline-offset-2 transition-colors hover:text-primary"
        >
          <ArrowLeft size={16} aria-hidden />
          Voltar para o formulário
        </button>
      </m.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(internalOnSubmit)} noValidate className="min-w-0 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="name" label="Nome completo *" error={errors.name?.message}>
          <input
            id="name"
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
            className={inputClass}
            placeholder="Seu nome completo"
          />
        </Field>

        <Field id="email" label="E-mail *" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
            className={inputClass}
            placeholder="nome@igreja.com"
          />
        </Field>

        <Field id="phone" label="Telefone *" error={errors.phone?.message}>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            value={phoneValue}
            onChange={handlePhoneChange}
            onBlur={() => setValue('phone', phoneValue.replace(/\D/g, ''), { shouldValidate: true, shouldTouch: true })}
            maxLength={15}
            className={inputClass}
            placeholder="(11) 99999-9999"
          />
        </Field>

        <Field id="churchName" label="Nome da igreja *" error={errors.churchName?.message}>
          <input
            id="churchName"
            type="text"
            autoComplete="organization"
            aria-invalid={Boolean(errors.churchName)}
            aria-describedby={errors.churchName ? 'churchName-error' : undefined}
            {...register('churchName')}
            className={inputClass}
            placeholder="Nome da sua igreja"
          />
        </Field>

        <Field
          id="state"
          label="Estado *"
          error={errors.state?.message}
          hint={
            loadingStates ? (
              <p className="mt-1.5 text-xs text-gray-500">Carregando estados...</p>
            ) : errorStates ? (
              <p className="mt-1.5 text-xs text-amber-700">
                Não foi possível carregar estados pela API do IBGE. Usando lista padrão de UFs.
              </p>
            ) : undefined
          }
        >
          <select
            id="state"
            autoComplete="address-level1"
            aria-invalid={Boolean(errors.state)}
            {...register('state')}
            className={inputClass}
            disabled={loadingStates}
          >
            <option value="">Selecione um estado</option>
            {states.map((state) => (
              <option key={state.id} value={state.sigla}>
                {state.nome}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="city"
          label="Cidade *"
          error={errors.city?.message}
          hint={
            !watchedState ? (
              <p className="mt-1.5 text-xs text-gray-500">Selecione um estado primeiro</p>
            ) : loadingCities ? (
              <p className="mt-1.5 text-xs text-gray-500">Carregando cidades...</p>
            ) : errorCities ? (
              <p className="mt-1.5 text-xs text-amber-700">
                Não foi possível carregar cidades. Tente selecionar o estado novamente.
              </p>
            ) : undefined
          }
        >
          <select
            id="city"
            autoComplete="address-level2"
            aria-invalid={Boolean(errors.city)}
            {...register('city')}
            className={inputClass}
            disabled={!watchedState || loadingCities}
          >
            <option value="">Selecione uma cidade</option>
            {cities.map((city) => (
              <option key={city.id} value={city.nome}>
                {city.nome}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2.5 block text-sm font-medium text-gray-700">Plano de interesse *</legend>
        <div className={cn('grid grid-cols-2 gap-2.5', closed && 'sm:grid-cols-3')}>
          {planOptions.map((plan) => {
            const isSelected = selectedPlan === plan.value;
            return (
              <button
                key={plan.value}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${plan.label}, ${plan.description}`}
                onClick={() => setValue('plan', plan.value, { shouldValidate: true })}
                className={cn(
                  'relative min-h-11 rounded-xl border p-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/20 active:scale-[0.98]',
                  isSelected
                    ? 'border-accent-500 bg-accent-50 shadow-[0_8px_20px_-12px_rgb(83_70_240/0.7)]'
                    : 'border-gray-200 bg-white hover:border-accent-300 hover:shadow-sm',
                  errors.plan && !isSelected && 'border-red-200'
                )}
              >
                <span
                  className={cn(
                    'absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
                    isSelected ? 'border-accent-500 bg-accent-500 text-white' : 'border-gray-300 bg-white'
                  )}
                >
                  {isSelected && <Check aria-hidden className="h-2.5 w-2.5" strokeWidth={3} />}
                </span>
                <span className={cn('block pr-5 text-sm font-semibold', isSelected ? 'text-accent-600' : 'text-gray-900')}>
                  {plan.label}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">{plan.description}</span>
              </button>
            );
          })}
        </div>
        {errors.plan && (
          <m.p role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-xs text-red-600">
            {errors.plan.message}
          </m.p>
        )}
      </fieldset>

      <Field id="message" label="Mensagem" error={errors.message?.message}>
        <textarea
          id="message"
          {...register('message')}
          rows={4}
          className={cn(inputClass, 'resize-none')}
          placeholder="Deixe uma mensagem adicional (opcional)"
        />
      </Field>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading || (errorStates !== null && states.length === 0)}
          className="group relative flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-[0_12px_30px_-12px_rgb(9_7_37/0.7)] transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader className="animate-spin" size={20} aria-hidden />
              Enviando...
            </>
          ) : (
            <>
              {closed ? 'Solicitar acesso' : 'Enviar'}
              <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </>
          )}
        </button>
        <p className="mt-3 text-center text-xs text-gray-500">
          Ao enviar, você concorda com a nossa{' '}
          <Link href="/privacidade" className="font-medium text-primary underline underline-offset-2 hover:text-accent-500">
            Política de Privacidade
          </Link>
          .
        </p>
      </div>
    </form>
  );
}

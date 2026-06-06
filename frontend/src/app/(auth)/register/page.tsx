'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { resolveCheckoutPath, persistSelectedPlan, clearPersistedPlan, isPaidPlanId } from '@/utils/planFunnel';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DENOMINATIONS } from '@/utils';
import { validateCNPJ } from '@/utils/validations';
import { CheckCircle2, Mail } from 'lucide-react';

// ACHADO 02: removidas variáveis de módulo globais (globalRegisterError, globalRegisterErrorDetails,
// globalFormData). Estado gerenciado exclusivamente via useState/useRef — sem vazamento entre abas.

// ACHADO 10: adicionada validação de dígitos verificadores do CNPJ via refine()
const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
  confirmPassword: z.string()
    .min(8, 'A confirmação de senha deve ter pelo menos 8 caracteres'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  name: z.string().min(2, 'Nome da igreja deve ter pelo menos 2 caracteres'),
  denomination: z.string().min(2, 'Denominação deve ter pelo menos 2 caracteres'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres'),
  state: z.string().length(2, 'Estado deve ter 2 caracteres'),
  cnpj: z.string()
    .length(14, 'CNPJ deve ter 14 dígitos')
    .regex(/^\d+$/, 'CNPJ deve conter apenas números')
    .refine(validateCNPJ, 'CNPJ inválido — verifique os dígitos'),
  email_church: z.string().email('Email da igreja inválido').optional().or(z.literal('')),
  phone_church: z.string().optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const denominations = DENOMINATIONS;

const statesFallback = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface State { id: number; sigla: string; nome: string; }
interface City { id: number; nome: string; }

const formatCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 14);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
};

const removeCNPJFormatting = (value: string): string => value.replace(/\D/g, '');

const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length === 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
};

const removePhoneFormatting = (value: string): string => value.replace(/\D/g, '');

function RegisterPageContent() {
  // ACHADO 02: estado local apenas — sem variáveis de módulo
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  // ACHADO 08: estado de sucesso pós-registro
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cnpjDisplay, setCnpjDisplay] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [phoneChurchDisplay, setPhoneChurchDisplay] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register: registerChurch, login, isOperationLoading } = useAuth();
  const searchParams = useSearchParams();
  const planFromUrl = searchParams.get('plan');
  const checkoutSessionIdFromUrl = searchParams.get('session_id');
  const linkTokenFromUrl = searchParams.get('link_token');

  useEffect(() => {
    if (isPaidPlanId(planFromUrl)) {
      persistSelectedPlan(planFromUrl);
    } else {
      clearPersistedPlan();
    }
  }, [planFromUrl]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const selectedState = watch('state');

  useEffect(() => {
    const loadStates = async () => {
      try {
        setIsLoadingStates(true);
        const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
        if (response.ok) {
          const data: State[] = await response.json();
          setStates(data);
        } else {
          setStates(statesFallback.map((sigla, index) => ({ id: index, sigla, nome: sigla })));
        }
      } catch {
        setStates(statesFallback.map((sigla, index) => ({ id: index, sigla, nome: sigla })));
      } finally {
        setIsLoadingStates(false);
      }
    };
    loadStates();
  }, []);

  useEffect(() => {
    const loadCities = async () => {
      if (!selectedState) { setCities([]); return; }
      try {
        setIsLoadingCities(true);
        const state = states.find(s => s.sigla === selectedState);
        if (state) {
          const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state.id}/municipios?orderBy=nome`);
          if (response.ok) {
            const data: City[] = await response.json();
            setCities(data);
          }
        }
      } catch {
        setCities([]);
      } finally {
        setIsLoadingCities(false);
      }
    };
    loadCities();
  }, [selectedState, states]);

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpjDisplay(formatted);
    setValue('cnpj', removeCNPJFormatting(formatted));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneDisplay(formatted);
    setValue('phone', removePhoneFormatting(formatted));
  };

  const handlePhoneChurchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneChurchDisplay(formatted);
    setValue('phone_church', removePhoneFormatting(formatted));
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (isSubmitting) return;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...dataToSend } = data;
    const cleanData = {
      ...dataToSend,
      cnpj: removeCNPJFormatting(dataToSend.cnpj),
      phone: removePhoneFormatting(dataToSend.phone),
      email_church: dataToSend.email_church || undefined,
      phone_church: dataToSend.phone_church ? removePhoneFormatting(dataToSend.phone_church) : undefined,
      ...(checkoutSessionIdFromUrl ? { checkout_session_id: checkoutSessionIdFromUrl } : {}),
      ...(linkTokenFromUrl ? { link_token: linkTokenFromUrl } : {}),
    };

    setIsSubmitting(true);
    setError(null);
    setErrorDetails(null);

    // ACHADO 01: Passo 1 — registrar a conta. Se falhar aqui, é erro de registro real.
    try {
      await registerChurch(cleanData);
    } catch (err: unknown) {
      let errorMessage = 'Erro ao registrar igreja';
      let errorDetailsValue: string | null = null;

      if (err instanceof Error) {
        errorMessage = err.message;
        const errorObj = err as Error & { details?: string | string[] };
        if (errorObj.details) {
          errorDetailsValue = typeof errorObj.details === 'string' ? errorObj.details : errorObj.details.join(', ');
        }
      } else if (err && typeof err === 'object') {
        const errorObj = err as { message?: string; details?: string | string[] };
        if (errorObj.message) errorMessage = errorObj.message;
        if (errorObj.details) {
          errorDetailsValue = Array.isArray(errorObj.details) ? errorObj.details.join(', ') : String(errorObj.details);
        }
      }

      setError(errorMessage);
      setErrorDetails(errorDetailsValue);
      setIsSubmitting(false);
      return;
    }

    // ACHADO 08: Registro concluído — mostrar estado de sucesso imediatamente
    setRegisteredEmail(cleanData.email);
    setRegistrationSuccess(true);

    // ACHADO 01: Passo 2 — tentar auto-login. Se falhar por email não confirmado,
    // mantemos o estado de sucesso (usuário precisa confirmar o email).
    // ACHADO 07: sessionStorage flag definida APENAS após login bem-sucedido.
    try {
      await login({ email: cleanData.email, password: cleanData.password });
      sessionStorage.setItem('redirectingToCheckout', 'true');
      window.location.href = resolveCheckoutPath(planFromUrl);
    } catch (loginErr: unknown) {
      const msg = loginErr instanceof Error ? loginErr.message.toLowerCase() : '';
      const isEmailNotConfirmed = msg.includes('email não confirmado') || msg.includes('not confirmed') || msg.includes('confirm');
      if (!isEmailNotConfirmed) {
        console.warn('[Register] Auto-login falhou por motivo inesperado após registro:', loginErr);
      }
      // Em qualquer caso: mantém registrationSuccess=true para mostrar orientação ao usuário.
      // sessionStorage NÃO é setado — nenhum redirect para checkout acontecerá.
    } finally {
      setIsSubmitting(false);
    }
  };

  // ACHADO 08: tela de confirmação de e-mail exibida após registro concluído
  if (registrationSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastro concluído!</h1>
          <p className="mt-2 text-gray-600">
            Sua conta foi criada com sucesso.
          </p>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Confirme seu e-mail para continuar</p>
              <p className="text-sm text-blue-700 mt-1">
                Enviamos um link de confirmação para <strong>{registeredEmail}</strong>.
                Clique no link do e-mail para ativar sua conta e acessar o sistema.
              </p>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Após confirmar o e-mail, acesse o sistema pelo login.
        </p>
        <Link
          href="/login"
          className="inline-block w-full py-2 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors text-center"
        >
          Ir para o Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Registrar Igreja</h1>
        <p className="mt-2 text-gray-600">
          Crie sua conta para começar a gerenciar sua igreja
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* ACHADO 12: reordenado — Email → Senha → Confirmar Senha → Telefone */}
        <Input
          label="Email"
          type="email"
          placeholder="igreja@exemplo.com"
          error={errors.email?.message}
          isLoading={isOperationLoading}
          {...register('email')}
        />

        <Input
          label="Senha"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          isLoading={isOperationLoading}
          {...register('password')}
        />

        <Input
          label="Confirmar Senha"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          isLoading={isOperationLoading}
          {...register('confirmPassword')}
        />

        <Input
          label="Telefone"
          type="tel"
          placeholder="(11) 99999-9999"
          error={errors.phone?.message}
          isLoading={isOperationLoading}
          {...register('phone')}
          value={phoneDisplay}
          onChange={handlePhoneChange}
        />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">Dados da Igreja</span>
          </div>
        </div>

        <Input
          label="Nome da Igreja"
          type="text"
          placeholder="Igreja Exemplo"
          error={errors.name?.message}
          {...register('name')}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Denominação
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isOperationLoading}
            {...register('denomination')}
          >
            <option value="">Selecione uma denominação</option>
            {denominations.map((denomination) => (
              <option key={denomination} value={denomination}>
                {denomination}
              </option>
            ))}
          </select>
          {errors.denomination && (
            <p className="text-sm text-red-600 mt-1">{errors.denomination.message}</p>
          )}
        </div>

        <Input
          label="Email da Igreja (opcional)"
          type="email"
          placeholder="contato@igreja.com"
          error={errors.email_church?.message}
          isLoading={isOperationLoading}
          {...register('email_church')}
        />

        <Input
          label="Telefone da Igreja (opcional)"
          type="tel"
          placeholder="(11) 3333-3333"
          error={errors.phone_church?.message}
          isLoading={isOperationLoading}
          {...register('phone_church')}
          value={phoneChurchDisplay}
          onChange={handlePhoneChurchChange}
        />

        <Input
          label="Endereço"
          type="text"
          placeholder="Rua das Flores, 123"
          error={errors.address?.message}
          {...register('address')}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              {...register('state')}
              disabled={isLoadingStates || isOperationLoading}
            >
              <option value="">{isLoadingStates ? 'Carregando...' : 'Selecione o estado'}</option>
              {states.map((state) => (
                <option key={state.sigla} value={state.sigla}>{state.nome}</option>
              ))}
            </select>
            {errors.state && <p className="text-sm text-red-600 mt-1">{errors.state.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              {...register('city')}
              disabled={!selectedState || isLoadingCities || isOperationLoading}
            >
              <option value="">
                {!selectedState ? 'Selecione o estado primeiro' : isLoadingCities ? 'Carregando...' : 'Selecione a cidade'}
              </option>
              {cities.map((city) => (
                <option key={city.id} value={city.nome}>{city.nome}</option>
              ))}
            </select>
            {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ</label>
          <input
            type="text"
            placeholder="00.000.000/0000-00"
            value={cnpjDisplay}
            onChange={handleCNPJChange}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            maxLength={18}
            disabled={isOperationLoading}
          />
          {errors.cnpj && <p className="text-sm text-red-600 mt-1">{errors.cnpj.message}</p>}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-600">{error}</p>
            {errorDetails && <p className="text-sm text-red-500 mt-1">{errorDetails}</p>}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          isLoading={isOperationLoading || isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Processando...' : 'Registrar Igreja'}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Já tem uma conta?{' '}
          <Link href="/login" className="font-medium text-primary hover:text-primary/80 cursor-pointer">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}

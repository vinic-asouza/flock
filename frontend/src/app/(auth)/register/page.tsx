'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DENOMINATIONS } from '@/utils';

// Estado global para erros de registro (persiste entre re-renderizações)
let globalRegisterError: string | null = null;
let globalRegisterErrorDetails: string | null = null;

// Estado global para dados do formulário (persiste entre re-renderizações)
let globalFormData: RegisterFormData | null = null;

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
  confirmPassword: z.string()
    .min(8, 'A confirmação de senha deve ter pelo menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A confirmação de senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  name: z.string().min(2, 'Nome da igreja deve ter pelo menos 2 caracteres'),
  denomination: z.string().min(2, 'Denominação deve ter pelo menos 2 caracteres'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres'),
  state: z.string().length(2, 'Estado deve ter 2 caracteres'),
  cnpj: z.string().length(14, 'CNPJ deve ter 14 dígitos').regex(/^\d+$/, 'CNPJ deve conter apenas números'),
  email_church: z.string().email('Email da igreja inválido').optional().or(z.literal('')),
  phone_church: z.string().optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const denominations = DENOMINATIONS;

// Estados brasileiros (fallback)
const statesFallback = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface State {
  id: number;
  sigla: string;
  nome: string;
}

interface City {
  id: number;
  nome: string;
}

// Função para formatar CNPJ
const formatCNPJ = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 14 dígitos
  const limitedNumbers = numbers.slice(0, 14);
  
  // Aplica a formatação XX.XXX.XXX/XXXX-XX
  if (limitedNumbers.length <= 2) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 5) {
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2)}`;
  } else if (limitedNumbers.length <= 8) {
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5)}`;
  } else if (limitedNumbers.length <= 12) {
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8)}`;
  } else {
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8, 12)}-${limitedNumbers.slice(12)}`;
  }
};

// Função para remover formatação do CNPJ
const removeCNPJFormatting = (value: string): string => {
  return value.replace(/\D/g, '');
};

// Função para formatar telefone
const formatPhone = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 11 dígitos (DDD + 9 dígitos)
  const limitedNumbers = numbers.slice(0, 11);
  
  // Se tem 11 dígitos, assume que é celular (formato: (XX) 9XXXX-XXXX)
  if (limitedNumbers.length === 11) {
    return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 7)}-${limitedNumbers.slice(7)}`;
  }
  // Se tem 10 dígitos, assume que é telefone fixo (formato: (XX) XXXX-XXXX)
  else if (limitedNumbers.length === 10) {
    return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 6)}-${limitedNumbers.slice(6)}`;
  }
  // Para menos de 10 dígitos, aplica formatação progressiva
  else if (limitedNumbers.length <= 2) {
    return `(${limitedNumbers}`;
  } else if (limitedNumbers.length <= 6) {
    return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2)}`;
  } else if (limitedNumbers.length <= 10) {
    return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 6)}-${limitedNumbers.slice(6)}`;
  } else {
    return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 7)}-${limitedNumbers.slice(7)}`;
  }
};

// Função para remover formatação do telefone
const removePhoneFormatting = (value: string): string => {
  return value.replace(/\D/g, '');
};

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(globalRegisterError);
  const [errorDetails, setErrorDetails] = useState<string | null>(globalRegisterErrorDetails);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [cnpjDisplay, setCnpjDisplay] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [phoneChurchDisplay, setPhoneChurchDisplay] = useState('');
  const { register: registerChurch, login, isOperationLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan');
  
  // Ref para manter os estados durante re-renderizações
  const errorRef = useRef<string | null>(globalRegisterError);
  const errorDetailsRef = useRef<string | null>(globalRegisterErrorDetails);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: globalFormData || undefined,
  });

  const selectedState = watch('state');

  // Carregar estados da API do IBGE
  useEffect(() => {
    const loadStates = async () => {
      try {
        setIsLoadingStates(true);
        const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
        if (response.ok) {
          const data: State[] = await response.json();
          setStates(data);
        } else {
          // Fallback para lista estática
          setStates(statesFallback.map((sigla, index) => ({ id: index, sigla, nome: sigla })));
        }
      } catch (error) {
        console.error('Erro ao carregar estados:', error);
        // Fallback para lista estática
        setStates(statesFallback.map((sigla, index) => ({ id: index, sigla, nome: sigla })));
      } finally {
        setIsLoadingStates(false);
      }
    };

    loadStates();
  }, []);

  // Carregar cidades quando estado for selecionado
  useEffect(() => {
    const loadCities = async () => {
      if (!selectedState) {
        setCities([]);
        return;
      }

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
      } catch (error) {
        console.error('Erro ao carregar cidades:', error);
        setCities([]);
      } finally {
        setIsLoadingCities(false);
      }
    };

    loadCities();
  }, [selectedState, states]);

  // Restaurar dados do formulário quando o componente montar
  useEffect(() => {
    if (globalFormData) {
      // Restaurar cada campo do formulário
      Object.entries(globalFormData).forEach(([key, value]) => {
        setValue(key as keyof RegisterFormData, value);
        // Restaurar CNPJ formatado se existir
        if (key === 'cnpj' && value) {
          setCnpjDisplay(formatCNPJ(value));
        }
        // Restaurar telefone formatado se existir
        if (key === 'phone' && value) {
          setPhoneDisplay(formatPhone(value));
        }
        // Restaurar telefone da igreja formatado se existir
        if (key === 'phone_church' && value) {
          setPhoneChurchDisplay(formatPhone(value));
        }
      });
    }
  }, [setValue]);

  // Limpar dados globais quando o componente desmontar
  useEffect(() => {
    return () => {
      // Só limpar se não houver erro (para manter dados em caso de erro)
      if (!globalRegisterError) {
        globalFormData = null;
      }
    };
  }, []);

  // Função para lidar com mudanças no CNPJ
  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCNPJ(value);
    setCnpjDisplay(formatted);
    
    // Atualizar o valor no formulário sem formatação
    const unformatted = removeCNPJFormatting(formatted);
    setValue('cnpj', unformatted);
  };

  // Função para lidar com mudanças no telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPhone(value);
    setPhoneDisplay(formatted);
    
    // Atualizar o valor no formulário sem formatação
    const unformatted = removePhoneFormatting(formatted);
    setValue('phone', unformatted);
  };

  // Função para lidar com mudanças no telefone da igreja
  const handlePhoneChurchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPhone(value);
    setPhoneChurchDisplay(formatted);
    
    // Atualizar o valor no formulário sem formatação
    const unformatted = removePhoneFormatting(formatted);
    setValue('phone_church', unformatted);
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);
      setErrorDetails(null);
      // Limpar estado global
      globalRegisterError = null;
      globalRegisterErrorDetails = null;
      
      // Remover confirmPassword e garantir que o CNPJ esteja sem formatação
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...dataToSend } = data;
      const cleanData = {
        ...dataToSend,
        cnpj: removeCNPJFormatting(dataToSend.cnpj),
        phone: removePhoneFormatting(dataToSend.phone), // Garantir que o telefone esteja sem formatação
        // Garantir que campos opcionais vazios sejam undefined
        email_church: dataToSend.email_church || undefined,
        phone_church: dataToSend.phone_church ? removePhoneFormatting(dataToSend.phone_church) : undefined
      };
      
      await registerChurch(cleanData);
      
      // Limpar dados do formulário em caso de sucesso
      globalFormData = null;
      reset();
      setCnpjDisplay('');
      setPhoneDisplay('');
      setPhoneChurchDisplay(''); // Limpar o display do telefone da igreja
      
      // Guardar email para instrução de confirmação
      setRegisteredEmail(cleanData.email);

      // Se houver plano selecionado, fazer login automático e redirecionar para checkout
      if (selectedPlan && ['100', '200', '500', '800'].includes(selectedPlan)) {
        try {
          // Marcar que estamos fazendo um redirect programático para checkout
          sessionStorage.setItem('redirectingToCheckout', 'true');
          
          // Fazer login automático com as credenciais do registro
          await login({
            email: cleanData.email,
            password: cleanData.password,
          });
          
          // Redirecionar imediatamente para checkout sem esperar
          // Usar window.location.replace para evitar que o usuário veja a página intermediária
          window.location.replace(`/checkout?plan=${selectedPlan}`);
          return;
        } catch (loginError: any) {
          // Limpar flag de redirect em caso de erro
          sessionStorage.removeItem('redirectingToCheckout');
          
          // Se o login falhar (ex: email precisa ser confirmado)
          // Verificar se é erro de email não confirmado
          const errorMessage = loginError?.message || '';
          const isEmailNotConfirmed = errorMessage.toLowerCase().includes('confirm') || 
                                     errorMessage.toLowerCase().includes('email não confirmado');
          
          if (isEmailNotConfirmed) {
            // Email não confirmado - redirecionar para login com mensagem
            // O usuário precisará confirmar o email primeiro
            router.push(`/login?redirect=/checkout?plan=${selectedPlan}&message=email_confirm_required`);
            return;
          }
          
          // Outro erro - redirecionar para login normalmente
          console.warn('Login automático falhou:', loginError);
          router.push(`/login?redirect=/checkout?plan=${selectedPlan}`);
          return;
        }
      }

      setSuccess(true);
      
    } catch (err: unknown) {
      let errorMessage = 'Erro ao registrar igreja';
      let errorDetails: string | null = null;
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Verificar se tem detalhes customizados
        const errorObj = err as Error & { details?: string | string[] };
        if (errorObj.details) {
          errorDetails = typeof errorObj.details === 'string' ? errorObj.details : errorObj.details.join(', ');
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        // Verificar se tem propriedades específicas
        const errorObj = err as { message?: string; details?: string | string[] };
        if (errorObj.message && typeof errorObj.message === 'string') {
          errorMessage = errorObj.message;
        }
        
        if (errorObj.details) {
          const details = errorObj.details;
          if (typeof details === 'string') {
            errorDetails = details;
          } else if (Array.isArray(details)) {
            errorDetails = details.join(', ');
          }
        }
      }
      
      // Salvar dados do formulário para manter durante re-renderizações
      globalFormData = data;
      
      // Salvar no estado global para persistir durante re-renderizações
      globalRegisterError = errorMessage;
      globalRegisterErrorDetails = errorDetails;
      
      // Atualizar tanto o estado quanto a ref
      setError(errorMessage);
      setErrorDetails(errorDetails);
      errorRef.current = errorMessage;
      errorDetailsRef.current = errorDetails;
    }
  };

  if (success) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Verifique seu email</h1>
          <p className="mt-2 text-gray-600">
            Enviamos um link de confirmação para {registeredEmail || 'seu email'}. 
          </p>
          <p className="mt-1 text-gray-500">
            Confirme o endereço para ativar sua conta. Após confirmar, clique no botão abaixo para acessar a página de login.
          </p>
          <p className="mt-1 text-gray-500">
            
          </p>
        </div>
        
        <div className="w-full">
          <Button 
            className="w-full"
            onClick={() => router.push('/login')}
          >
            Ir para o Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Registrar Igreja</h1>
        <p className="mt-2 text-gray-600">
          Crie sua conta para começar a gerenciar sua igreja
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="igreja@exemplo.com"
          error={errors.email?.message}
          isLoading={isOperationLoading}
          {...register('email')}
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

        {/* Linha divisória */}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              {...register('state')}
              disabled={isLoadingStates || isOperationLoading}
            >
              <option value="">
                {isLoadingStates ? 'Carregando...' : 'Selecione o estado'}
              </option>
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
              {...register('city')}
              disabled={!selectedState || isLoadingCities || isOperationLoading}
            >
              <option value="">
                {!selectedState 
                  ? 'Selecione o estado primeiro' 
                  : isLoadingCities 
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CNPJ
          </label>
          <input
            type="text"
            placeholder="00.000.000/0000-00"
            value={cnpjDisplay}
            onChange={handleCNPJChange}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            maxLength={18}
            disabled={isOperationLoading}
          />
          {errors.cnpj && (
            <p className="text-sm text-red-600 mt-1">{errors.cnpj.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={isOperationLoading}
        >
          Registrar Igreja
        </Button>
      </form>

      {/* Bloco de Erro - Posicionado após o formulário para melhor visibilidade */}
      {(error || globalRegisterError) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm font-medium text-red-600">
            {error || globalRegisterError}
          </p>
          {(errorDetails || globalRegisterErrorDetails) && (
            <p className="text-sm text-red-500 mt-1">
              {errorDetails || globalRegisterErrorDetails}
            </p>
          )}
        </div>
      )}

      {/* Links */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Já tem uma conta?{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary/80 cursor-pointer"
            onClick={() => {
              globalFormData = null;
              globalRegisterError = null;
              globalRegisterErrorDetails = null;
            }}
          >
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
} 
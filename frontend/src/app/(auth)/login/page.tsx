'use client';

import { useState, useRef, memo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// Estado global para erros de login (persiste entre re-renderizações)
let globalLoginError: string | null = null;
let globalLoginErrorDetails: string | null = null;

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginPageComponent() {
  const [error, setError] = useState<string | null>(globalLoginError);
  const [errorDetails, setErrorDetails] = useState<string | null>(globalLoginErrorDetails);
  const { login, isOperationLoading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const message = searchParams.get('message');
  
  // Ref para manter os estados durante re-renderizações
  const errorRef = useRef<string | null>(globalLoginError);
  const errorDetailsRef = useRef<string | null>(globalLoginErrorDetails);

  // Mostrar mensagem especial se houver
  useEffect(() => {
    if (message === 'email_confirm_required') {
      setError('Confirme seu email para continuar');
      setErrorDetails('Enviamos um link de confirmação para seu email. Por favor, confirme seu email antes de fazer login.');
    }
  }, [message]);

  // Estado para controlar se estamos no meio de um login
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Se já estiver autenticado ao carregar a página (não após submit), redirecionar
  useEffect(() => {
    // Só redirecionar automaticamente se:
    // 1. Usuário está autenticado
    // 2. NÃO estamos no meio de um processo de login (para evitar conflito)
    // 3. Não há redirectUrl OU há redirectUrl (vamos respeitar o redirectUrl sempre)
    if (user && !isLoggingIn) {
      if (redirectUrl) {
        router.push(redirectUrl);
      } else {
        router.push('/');
      }
    }
  }, [user, redirectUrl, router, isLoggingIn]);



  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoggingIn(true);
      setError(null);
      setErrorDetails(null);
      // Limpar estado global
      globalLoginError = null;
      globalLoginErrorDetails = null;
      
      await login(data);
      
      // Aguardar um momento para garantir que o estado do usuário foi atualizado no contexto
      // Isso garante que o useEffect não interfira
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Redirecionar para URL de redirect se houver, senão para home
      // Usar window.location para garantir que o redirecionamento aconteça
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        router.push('/');
      }
      
      // Não resetar isLoggingIn aqui pois vamos sair da página
    } catch (err: unknown) {
      let errorMessage = 'Erro ao fazer login';
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
      
      // Mapear erro de email não confirmado para mensagem amigável
      const combined = `${errorMessage} ${errorDetails || ''}`.toLowerCase();
      if (combined.includes('email não confirmado') || combined.includes('confirm')) {
        errorMessage = 'Necessário realizar confirmação de email';
        errorDetails = 'Verifique sua caixa de entrada e clique no link de confirmação.';
      }

      // Salvar no estado global para persistir durante re-renderizações
      globalLoginError = errorMessage;
      globalLoginErrorDetails = errorDetails;
      
      // Atualizar tanto o estado quanto a ref
      setError(errorMessage);
      setErrorDetails(errorDetails);
      errorRef.current = errorMessage;
      errorDetailsRef.current = errorDetails;
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Entrar no Flock</h1>
        <p className="mt-2 text-gray-600">
          Acesse sua conta para gerenciar sua igreja
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {(error || globalLoginError) && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-600">
              {error || globalLoginError}
            </p>
            {(errorDetails || globalLoginErrorDetails) && (
              <p className="text-sm text-red-500 mt-1">
                {errorDetails || globalLoginErrorDetails}
              </p>
            )}
          </div>
        )}

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

        <div className="flex items-center justify-between">
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:text-primary/80 cursor-pointer"
            onClick={() => {
              globalLoginError = null;
              globalLoginErrorDetails = null;
            }}
          >
            Esqueceu sua senha?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={isOperationLoading}
        >
          Entrar
        </Button>
      </form>

      {/* Links */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Não tem uma conta?{' '}
          <Link
            href="/register"
            className="font-medium text-primary hover:text-primary/80 cursor-pointer"
            onClick={() => {
              globalLoginError = null;
              globalLoginErrorDetails = null;
            }}
          >
            Registre sua igreja
          </Link>
        </p>
      </div>
    </div>
  );
}

// Memoizar o componente para evitar re-renderizações desnecessárias
export default memo(LoginPageComponent); 
'use client';

import { useState, memo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// ACHADO 02: schema de LOGIN não deve validar complexidade de senha —
// apenas verificar que o campo não está vazio. Complexidade é validada no cadastro.
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ACHADO 01: verifica se a URL de redirect é interna (mesmo origin ou caminho relativo)
const isInternalRedirect = (url: string): boolean => {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return url.startsWith('/') && !url.startsWith('//');
  }
};

function LoginPageComponent() {
  // ACHADO 05: removidas variáveis de módulo globais — estado apenas via useState
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const { login, isOperationLoading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const message = searchParams.get('message');

  useEffect(() => {
    if (message === 'email_confirm_required') {
      setError('Confirme seu email para continuar');
      setErrorDetails('Enviamos um link de confirmação para seu email. Por favor, confirme seu email antes de fazer login.');
    }
  }, [message]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Redirecionar automaticamente se o usuário já estiver autenticado ao carregar a página
  useEffect(() => {
    if (user && !isLoggingIn) {
      // ACHADO 01: validar que o redirect é uma rota interna antes de redirecionar
      if (redirectUrl && isInternalRedirect(redirectUrl)) {
        window.location.replace(redirectUrl);
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

      await login(data);

      // Aguardar brevemente para garantir que o estado do AuthContext foi atualizado
      await new Promise(resolve => setTimeout(resolve, 150));

      // ACHADO 01: validar redirect antes de usar
      if (redirectUrl && isInternalRedirect(redirectUrl)) {
        window.location.replace(redirectUrl);
      } else {
        router.push('/');
      }

      // ACHADO 07: reset de segurança caso a navegação não ocorra (ex: router.push falho)
      setTimeout(() => setIsLoggingIn(false), 2000);
    } catch (err: unknown) {
      let errorMessage = 'Erro ao fazer login';
      let errorDetailsValue: string | null = null;

      if (err instanceof Error) {
        errorMessage = err.message;
        const errorObj = err as Error & { details?: string | string[] };
        if (errorObj.details) {
          errorDetailsValue = typeof errorObj.details === 'string' ? errorObj.details : errorObj.details.join(', ');
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        const errorObj = err as { message?: string; details?: string | string[] };
        if (errorObj.message && typeof errorObj.message === 'string') {
          errorMessage = errorObj.message;
        }
        if (errorObj.details) {
          const details = errorObj.details;
          if (typeof details === 'string') {
            errorDetailsValue = details;
          } else if (Array.isArray(details)) {
            errorDetailsValue = details.join(', ');
          }
        }
      }

      const combined = `${errorMessage} ${errorDetailsValue || ''}`.toLowerCase();
      if (combined.includes('email não confirmado') || combined.includes('confirm')) {
        errorMessage = 'Necessário realizar confirmação de email';
        errorDetailsValue = 'Verifique sua caixa de entrada e clique no link de confirmação.';
      }

      setError(errorMessage);
      setErrorDetails(errorDetailsValue);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Entrar no Flock</h1>
        <p className="mt-2 text-gray-600">
          Acesse sua conta para gerenciar sua igreja
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-600">{error}</p>
            {errorDetails && (
              <p className="text-sm text-red-500 mt-1">{errorDetails}</p>
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

      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Ainda não possui conta?{' '}
          <Link
            href={`${process.env.NEXT_PUBLIC_LANDING_URL || 'http://localhost:3000'}#pricing`}
            className="text-primary hover:text-primary/80 font-medium underline"
          >
            Selecione um plano e realize seu cadastro
          </Link>
        </p>
      </div>
    </div>
  );
}

export default memo(LoginPageComponent);

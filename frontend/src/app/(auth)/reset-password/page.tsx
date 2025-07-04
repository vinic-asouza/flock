'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação de senha deve ter pelo menos 6 caracteres'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const { resetPassword, isOperationLoading } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Extrair token do hash da URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const expiresAt = params.get('expires_at');
      
      if (accessToken && expiresAt) {
        const expirationTime = parseInt(expiresAt) * 1000; // Converter para milissegundos
        const currentTime = Date.now();
        
        if (currentTime < expirationTime) {
          setToken(accessToken);
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
          setError('Link de recuperação expirado');
          setErrorDetails('O link de recuperação de senha expirou. Solicite um novo link.');
        }
      } else {
        setIsValidToken(false);
        setError('Link inválido');
        setErrorDetails('O link de recuperação de senha é inválido.');
      }
    } else {
      setIsValidToken(false);
      setError('Link não encontrado');
      setErrorDetails('Nenhum link de recuperação foi fornecido.');
    }
  }, []);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Token não disponível');
      return;
    }

    try {
      setError(null);
      setErrorDetails(null);
      
      // Remover confirmPassword antes de enviar
      const { confirmPassword, ...dataToSend } = data;
      
      await resetPassword({
        ...dataToSend,
        token // Incluir o token extraído da URL
      });
      
      setSuccess(true);
      
      // Aguardar um pouco para mostrar a mensagem de sucesso
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: unknown) {
      let errorMessage = 'Erro ao redefinir senha';
      let errorDetails: string | null = null;
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Verificar se tem detalhes customizados
        const errorObj = err as any;
        if (errorObj.details) {
          errorDetails = errorObj.details;
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        // Verificar se tem propriedades específicas
        if ('message' in err && typeof (err as any).message === 'string') {
          errorMessage = (err as any).message;
        }
        
        if ('details' in err) {
          const details = (err as any).details;
          if (typeof details === 'string') {
            errorDetails = details;
          } else if (Array.isArray(details)) {
            errorDetails = details.join(', ');
          }
        }
      }
      
      setError(errorMessage);
      setErrorDetails(errorDetails);
    }
  };

  // Mostrar loading enquanto verifica o token
  if (isValidToken === null) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
            <svg className="h-6 w-6 text-primary animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Verificando Link</h1>
          <p className="mt-2 text-gray-600">
            Verificando se o link de recuperação é válido...
          </p>
        </div>
      </div>
    );
  }

  // Mostrar erro se token for inválido
  if (isValidToken === false) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Link Inválido</h1>
          <p className="mt-2 text-gray-600">
            {error}
          </p>
          {errorDetails && (
            <p className="mt-2 text-sm text-gray-500">
              {errorDetails}
            </p>
          )}
        </div>
        
        <div className="w-full">
          <Link href="/forgot-password">
            <Button className="w-full">
              Solicitar Novo Link
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Mostrar sucesso
  if (success) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Senha Redefinida!</h1>
          <p className="mt-2 text-gray-600">
            Sua senha foi redefinida com sucesso! Você será redirecionado para o login em alguns segundos...
          </p>
        </div>
        
        <div className="w-full">
          <Button 
            className="w-full"
            onClick={() => router.push('/login')}
          >
            Ir para o Login Agora
          </Button>
        </div>
      </div>
    );
  }

  // Formulário de reset de senha
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Redefinir Senha</h1>
        <p className="mt-2 text-gray-600">
          Digite sua nova senha
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-600">{error}</p>
            {errorDetails && (
              <p className="text-sm text-red-500 mt-1">{errorDetails}</p>
            )}
          </div>
        )}

        <Input
          label="Nova Senha"
          type="password"
          placeholder="••••••••"
          error={errors.newPassword?.message}
          isLoading={isOperationLoading}
          {...register('newPassword')}
        />

        <Input
          label="Confirmar Nova Senha"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          isLoading={isOperationLoading}
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          className="w-full"
          isLoading={isOperationLoading}
        >
          Redefinir Senha
        </Button>
      </form>

      {/* Links */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Lembrou sua senha?{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary/80 cursor-pointer"
          >
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
} 
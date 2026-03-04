'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const createPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type CreatePasswordFormData = z.infer<typeof createPasswordSchema>;

export default function CreatePasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { forgotPassword, isOperationLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePasswordFormData>({
    resolver: zodResolver(createPasswordSchema),
  });

  const onSubmit = async (data: CreatePasswordFormData) => {
    try {
      setError(null);
      setErrorDetails(null);
      await forgotPassword(data);
      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao solicitar criação de senha';
      setError(errorMessage);

      if (err && typeof err === 'object' && 'details' in err) {
        const details = (err as { details?: string | string[] }).details;
        if (typeof details === 'string') {
          setErrorDetails(details);
        } else if (Array.isArray(details)) {
          setErrorDetails(details.join(', '));
        }
      }
    }
  };

  if (success) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Email enviado!</h1>
          <p className="mt-2 text-gray-600">
            Se existir uma conta com este email, você receberá instruções para definir sua senha.
          </p>
        </div>

        <div className="w-full">
          <Link href="/login">
            <Button className="w-full">
              Ir para o login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Definir senha de acesso</h1>
        <p className="mt-2 text-gray-600">
          Você foi convidado(a) para acessar o Flock. Informe seu email para receber um link e criar sua senha.
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
          placeholder="usuario@exemplo.com"
          error={errors.email?.message}
          isLoading={isOperationLoading}
          {...register('email')}
        />

        <Button
          type="submit"
          className="w-full"
          isLoading={isOperationLoading}
        >
          Enviar link para criar senha
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Já tem uma senha?{' '}
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


'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SessionInitErrorProps {
  variant: 'checkout' | 'session';
  isAuthenticated: boolean;
  onRetry: () => void;
}

export function SessionInitError({ variant, isAuthenticated, onRetry }: SessionInitErrorProps) {
  const title = 'Não foi possível carregar';
  const description = variant === 'checkout'
    ? 'A escolha de plano não abriu. Você pode tentar de novo ou entrar no painel.'
    : 'A verificação da sessão não terminou. Você pode tentar de novo ou ir para o login.';
  const exitHref = isAuthenticated ? '/' : '/login';
  const exitLabel = isAuthenticated ? 'Ir para o painel' : 'Ir para o login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-md text-center">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-600" aria-hidden />
        <h1 className="text-lg font-medium text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-600">{description}</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button type="button" onClick={onRetry} className="min-h-11 w-full">
            Tentar novamente
          </Button>
          <Link
            href={exitHref}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900"
          >
            {exitLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

function AuthGuardComponent({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, isOperationLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Só redirecionar se não estiver em uma operação de loading
    if (!isLoading && !isOperationLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, isOperationLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900 mb-2">Inicializando...</p>
          <p className="text-sm text-gray-500">Carregando configurações</p>
        </div>
      </div>
    );
  }

  // Só mostrar loading de redirecionamento se não estiver em uma operação
  if (isAuthenticated && !isOperationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900 mb-2">Redirecionando...</p>
          <p className="text-sm text-gray-500">Você será direcionado para o painel</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Memoizar o componente para evitar re-renderizações desnecessárias
export const AuthGuard = memo(AuthGuardComponent); 
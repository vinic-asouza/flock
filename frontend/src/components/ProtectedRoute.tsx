'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirecionar imediatamente quando não autenticado
    if (!isLoading && !isAuthenticated) {
      // Usar replace para não adicionar ao histórico
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Mostrar loading apenas brevemente durante verificação inicial
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
        </div>
      </div>
    );
  }

  // Não renderizar nada se não autenticado - redirecionamento em andamento
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 
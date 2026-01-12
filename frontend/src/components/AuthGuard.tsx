'use client';

import { useEffect, memo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

interface AuthGuardProps {
  children: React.ReactNode;
}

function AuthGuardContent({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, isOperationLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Não redirecionar se:
    // 1. Estiver em uma operação de loading
    // 2. Estiver na página de checkout (precisa estar autenticado)
    // 3. Houver um parâmetro redirect na URL (o componente de login/register vai lidar com isso)
    // 4. Estivermos fazendo um redirect programático para checkout
    const redirectUrl = searchParams.get('redirect');
    const isOnCheckoutPage = pathname === '/checkout';
    const hasRedirectParam = !!redirectUrl;
    const isRedirectingToCheckout = typeof window !== 'undefined' && sessionStorage.getItem('redirectingToCheckout') === 'true';
    
    // Limpar flag de redirect se chegamos na página de checkout
    if (isOnCheckoutPage && isRedirectingToCheckout) {
      sessionStorage.removeItem('redirectingToCheckout');
    }
    
    // Só redirecionar se não estiver em uma operação de loading
    // E não estiver em checkout (checkout permite usuários autenticados)
    // E não houver parâmetro redirect (que indica que o usuário precisa ir para outra página)
    // E não estivermos fazendo um redirect programático para checkout
    if (!isLoading && !isOperationLoading && isAuthenticated && !isOnCheckoutPage && !hasRedirectParam && !isRedirectingToCheckout) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, isOperationLoading, router, pathname, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">Inicializando...</p>
          <p className="text-sm text-gray-500">Carregando configurações</p>
        </div>
      </div>
    );
  }

  // Só mostrar loading de redirecionamento se não estiver em uma operação
  // E não estiver em checkout ou com redirect
  // E não estivermos fazendo um redirect programático para checkout
  const redirectUrl = searchParams.get('redirect');
  const isOnCheckoutPage = pathname === '/checkout';
  const hasRedirectParam = !!redirectUrl;
  const isRedirectingToCheckout = typeof window !== 'undefined' && sessionStorage.getItem('redirectingToCheckout') === 'true';
  
  // Não mostrar loading e não redirecionar se estiver na página de checkout
  // A página de checkout permite usuários autenticados
  if (isAuthenticated && !isOperationLoading && !isOnCheckoutPage && !hasRedirectParam && !isRedirectingToCheckout) {
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

function AuthGuardComponent({ children }: AuthGuardProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <div className="text-center">
            <Spinner className="mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Carregando...</p>
          </div>
        </div>
      }
    >
      <AuthGuardContent>{children}</AuthGuardContent>
    </Suspense>
  );
}

// Memoizar o componente para evitar re-renderizações desnecessárias
export const AuthGuard = memo(AuthGuardComponent); 
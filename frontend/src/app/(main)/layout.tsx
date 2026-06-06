'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/main/Sidebar';
import { Header } from '@/components/main/Header';
import { Footer } from '@/components/main/Footer';
import { useAuth } from '@/context/AuthContext';
import { ChurchSelectionGate } from '@/components/auth/ChurchSelectionGate';
import { Spinner } from '@/components/ui/Spinner';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, isLoading, isAuthenticated, churchSelectionRequired } = useAuth();
  const router = useRouter();

  // ACHADO 16: redirecionar para /login se o usuário não estiver autenticado.
  // Sem essa proteção, todas as rotas /members, /groups, /calendar etc. ficavam
  // expostas — o usuário via a "casca" do app antes de qualquer erro aparecer.
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !churchSelectionRequired) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, churchSelectionRequired, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  // Evitar flash de conteúdo enquanto o redirect ainda não ocorreu
  if (!isAuthenticated && !churchSelectionRequired) {
    return null;
  }

  if (churchSelectionRequired) {
    return <ChurchSelectionGate>{null}</ChurchSelectionGate>;
  }

  return (
    <ChurchSelectionGate>
    <div className="h-screen bg-app flex flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar churchName={user?.name || ''} />
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col">
            <div className="flex-1 p-6 md:p-10">
              {children}
            </div>
            <Footer />
          </div>
        </main>
      </div>
    </div>
    </ChurchSelectionGate>
  );
}

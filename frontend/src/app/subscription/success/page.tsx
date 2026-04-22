'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
// ACHADO 05: importado Clock para estado de verificação pendente
import { CheckCircle2, Loader, XCircle, ArrowRight, Clock } from 'lucide-react';
// ACHADO 04: usar apiService para garantir interceptor de 401
import apiService from '@/services/api';

function SubscriptionSuccessContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading, refreshChurch } = useAuth();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // P01: aguardar AuthContext inicializar antes de verificar autenticação
    if (isAuthLoading) return;

    // P01: redirecionar para login se não autenticado
    if (!user) {
      setIsLoading(false);
      return;
    }

    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 15;
    const pollInterval = 2000;
    // ACHADO 06: flags para cleanup e prevenção de state updates em componente desmontado
    let timeoutId: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const checkSubscriptionStatus = async () => {
      if (!isMounted) return;

      try {
        // ACHADO 04: usar apiService.getCheckoutStatus() em vez de axios direto
        const data = await apiService.getCheckoutStatus(sessionId);

        if (data.confirmed) {
          if (isMounted) {
            setIsLoading(false);
            if (refreshChurch) await refreshChurch();
          }
          return;
        }

        attempts++;
        if (attempts < maxAttempts && isMounted) {
          timeoutId = setTimeout(checkSubscriptionStatus, pollInterval);
        } else if (isMounted) {
          setIsLoading(false);
          setError('Não foi possível confirmar o pagamento automaticamente. Verifique sua assinatura nas configurações ou tente sincronizar manualmente.');
        }
      } catch (err: unknown) {
        attempts++;
        if (attempts < maxAttempts && isMounted) {
          timeoutId = setTimeout(checkSubscriptionStatus, pollInterval);
        } else if (isMounted) {
          setIsLoading(false);
          const errorMessage = err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
            : undefined;
          setError(
            errorMessage ||
            'Erro ao verificar status do pagamento. Tente sincronizar manualmente nas configurações.'
          );
        }
      }
    };

    // ACHADO 06: aguardar 2s antes do primeiro check (dar tempo para webhook processar)
    timeoutId = setTimeout(checkSubscriptionStatus, pollInterval);

    // ACHADO 06: cleanup — cancela timeout pendente e evita state updates após unmount
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [sessionId, user, isAuthLoading, refreshChurch]);

  // P01: ainda inicializando o AuthContext — mostrar loading
  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">Processando sua assinatura...</p>
          <p className="text-sm text-gray-500">Aguarde enquanto confirmamos seu pagamento</p>
        </div>
      </div>
    );
  }

  // P01: usuário não autenticado após carregamento — redirecionar para login
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">

        {/* ACHADO 05: heading e ícone condicionados ao estado de erro */}
        <div className="text-center mb-8">
          {error ? (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Verificação Pendente
              </h1>
              <p className="text-gray-600">
                Seu pagamento foi recebido, mas a confirmação está demorando.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Pagamento Confirmado!
              </h1>
              <p className="text-gray-600">
                Sua assinatura foi ativada com sucesso
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <XCircle className="h-5 w-5 text-red-600 mr-2 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-8">
          {/* R01: card verde exibido apenas no estado de sucesso */}
          {!error && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Obrigado pela sua assinatura!</strong>
              </p>
              <p className="text-sm text-green-700 mt-1">
                Você receberá um email de confirmação com os detalhes da sua assinatura em breve.
              </p>
            </div>
          )}

          {/* R01: orientação específica de suporte no estado de erro */}
          {error && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>O que fazer agora?</strong>
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Acesse <strong>Configurações → Plano</strong> para verificar se sua assinatura foi ativada. Se o problema persistir, entre em contato com o suporte.
              </p>
            </div>
          )}

          {/* ACHADO 13: removido bloco com ID de sessão Stripe — informação técnica sem valor para o usuário */}

          {!error && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Próximos passos:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Acesse sua conta para começar a usar o sistema</li>
                <li>Configure sua igreja e adicione seus membros</li>
                <li>Explore os recursos disponíveis no seu plano</li>
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button onClick={() => router.push('/')} className="w-full">
            Ir para o Sistema
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Precisa de ajuda? Entre em contato com nosso suporte.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Carregando...</p>
          </div>
        </div>
      }
    >
      <SubscriptionSuccessContent />
    </Suspense>
  );
}

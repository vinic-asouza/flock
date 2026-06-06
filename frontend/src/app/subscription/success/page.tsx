'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Loader, XCircle, ArrowRight, Clock } from 'lucide-react';
import apiService, { formatApiError } from '@/services/api';

const WAITING_STATUS_MESSAGES = [
  'Pagamento ainda não foi processado',
  'Assinatura ainda não foi criada',
  'Pagamento confirmado, aguardando processamento',
];

function isTerminalCheckoutMessage(message: string | undefined): boolean {
  if (!message) return false;
  return !WAITING_STATUS_MESSAGES.some((fragment) => message.includes(fragment));
}

function SubscriptionSuccessContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [missingSessionId, setMissingSessionId] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading, refreshChurch } = useAuth();
  const sessionId = searchParams.get('session_id');
  const userId = user?.id;

  useEffect(() => {
    if (isAuthLoading) return;
    if (isConfirmed) return;

    if (!userId) {
      setIsLoading(false);
      return;
    }

    if (!sessionId) {
      setMissingSessionId(true);
      setIsLoading(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 12;
    const baseDelayMs = 2000;
    let timeoutId: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const checkSubscriptionStatus = async () => {
      if (!isMounted) return;

      try {
        const data = await apiService.getCheckoutStatus(sessionId);

        if (data.confirmed) {
          if (isMounted) {
            setIsConfirmed(true);
            setIsLoading(false);
          }
          try {
            if (refreshChurch) await refreshChurch();
          } catch {
            if (isMounted) {
              setRefreshWarning(
                'Plano ativado. Recarregue a página se os dados não atualizarem.'
              );
            }
          }
          return;
        }

        if (isTerminalCheckoutMessage(data.message)) {
          if (isMounted) {
            setIsLoading(false);
            setError(data.message || formatApiError(data.error) || 'Não foi possível confirmar o pagamento.');
          }
          return;
        }

        attempts++;
        if (attempts < maxAttempts && isMounted) {
          const delay = Math.min(baseDelayMs * Math.pow(1.5, attempts), 15000);
          timeoutId = setTimeout(checkSubscriptionStatus, delay);
        } else if (isMounted) {
          setIsLoading(false);
          setError(
            'Não foi possível confirmar o pagamento automaticamente. Verifique sua assinatura nas configurações ou tente sincronizar manualmente.'
          );
        }
      } catch (err: unknown) {
        attempts++;
        if (attempts < maxAttempts && isMounted) {
          const delay = Math.min(baseDelayMs * Math.pow(1.5, attempts), 15000);
          timeoutId = setTimeout(checkSubscriptionStatus, delay);
        } else if (isMounted) {
          setIsLoading(false);
          setError(
            formatApiError(err) ||
            'Erro ao verificar status do pagamento. Tente sincronizar manualmente nas configurações.'
          );
        }
      }
    };

    timeoutId = setTimeout(checkSubscriptionStatus, baseDelayMs);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [sessionId, userId, isAuthLoading, isConfirmed, refreshChurch]);

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

  if (!user) {
    const redirectPath = sessionId
      ? `/subscription/success?session_id=${encodeURIComponent(sessionId)}`
      : '/subscription/success';
    router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">

        <div className="text-center mb-8">
          {missingSessionId ? (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                <XCircle className="h-8 w-8 text-gray-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Sessão de pagamento não encontrada
              </h1>
              <p className="text-gray-600">
                Não foi possível validar seu pagamento nesta página. Verifique sua assinatura nas configurações.
              </p>
            </>
          ) : error ? (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Verificação Pendente
              </h1>
              <p className="text-gray-600">
                Seu pagamento pode ter sido recebido, mas a confirmação automática está demorando.
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

        {(error || missingSessionId) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <XCircle className="h-5 w-5 text-red-600 mr-2 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  {missingSessionId
                    ? 'Acesse Configurações → Plano para sincronizar ou confirmar sua assinatura.'
                    : error}
                </p>
              </div>
            </div>
          </div>
        )}

        {refreshWarning && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">{refreshWarning}</p>
          </div>
        )}

        <div className="space-y-4 mb-8">
          {!error && !missingSessionId && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Obrigado pela sua assinatura!</strong>
              </p>
              <p className="text-sm text-green-700 mt-1">
                Você receberá um email de confirmação com os detalhes da sua assinatura em breve.
              </p>
            </div>
          )}

          {(error || missingSessionId) && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>O que fazer agora?</strong>
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Acesse <strong>Configurações → Plano</strong> para verificar se sua assinatura foi ativada ou use{' '}
                <strong>Sincronizar Assinatura</strong>. Se o problema persistir, entre em contato com o suporte.
              </p>
            </div>
          )}

          {!error && !missingSessionId && (
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
          {(error || missingSessionId) && (
            <Button onClick={() => router.push('/settings?tab=payment')} variant="secondary" className="w-full">
              Ir para Configurações → Plano
            </Button>
          )}
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

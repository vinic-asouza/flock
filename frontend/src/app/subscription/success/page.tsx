'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Loader, XCircle, ArrowRight } from 'lucide-react';

export default function SubscriptionSuccessPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Aguardar um momento para garantir que o webhook processou
    // O webhook do Stripe processa a assinatura em background
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento Confirmado!
          </h1>
          <p className="text-gray-600">
            Sua assinatura foi ativada com sucesso
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <XCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-8">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Obrigado pela sua assinatura!</strong>
            </p>
            <p className="text-sm text-green-700 mt-1">
              Você receberá um email de confirmação com os detalhes da sua assinatura em breve.
            </p>
          </div>

          {sessionId && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>ID da Sessão:</strong>
                <br />
                <span className="break-all">{sessionId}</span>
              </p>
            </div>
          )}

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
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => router.push('/')}
            className="w-full"
          >
            Ir para o Sistema
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/settings')}
            className="w-full"
          >
            Ver Detalhes da Assinatura
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


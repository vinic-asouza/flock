'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { XCircle, CreditCard } from 'lucide-react';

export default function SubscriptionCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
            <XCircle className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento Cancelado
          </h1>
          <p className="text-gray-600">
            Você cancelou o processo de pagamento
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Nenhum pagamento foi processado.</strong>
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Você pode tentar novamente a qualquer momento.
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Deseja tentar novamente?</strong>
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Você pode voltar e finalizar sua assinatura quando estiver pronto.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => router.push('/checkout')}
            className="w-full"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Tentar Novamente
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Se você teve algum problema durante o pagamento, entre em contato com nosso suporte.
          </p>
        </div>
      </div>
    </div>
  );
}


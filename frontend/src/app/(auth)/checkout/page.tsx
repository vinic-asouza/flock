'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Loader, CreditCard, CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const plan = searchParams.get('plan') as '200' | '500' | '800' | 'custom' | null;

  useEffect(() => {
    // Verificar se usuário está autenticado
    if (!user) {
      router.push('/login?redirect=/checkout' + (plan ? `?plan=${plan}` : ''));
      return;
    }

    // Verificar se plano é válido
    if (!plan || !['200', '500', '800', 'custom'].includes(plan)) {
      setError('Plano inválido. Por favor, selecione um plano válido.');
      return;
    }
  }, [user, plan, router]);

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Criar sessão de checkout
      const response = await axios.post(
        `${API_URL}/stripe/create-checkout-session`,
        { plan },
        {
          withCredentials: true, // Incluir cookies de autenticação
        }
      );

      const { url } = response.data;

      if (!url) {
        throw new Error('URL de checkout não recebida');
      }

      // Redirecionar para checkout do Stripe
      window.location.href = url;
    } catch (err: any) {
      console.error('Erro ao criar checkout:', err);
      setError(
        err.response?.data?.error ||
        err.message ||
        'Erro ao iniciar processo de pagamento. Tente novamente.'
      );
      setIsLoading(false);
    }
  };

  if (!user) {
    return null; // Redirecionamento em andamento
  }

  if (!plan || !['200', '500', '800', 'custom'].includes(plan)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Plano Inválido</h1>
          <p className="text-gray-600 mb-6">
            {error || 'Por favor, selecione um plano válido na página de planos.'}
          </p>
          <Button onClick={() => router.push('/')}>
            Voltar para o Início
          </Button>
        </div>
      </div>
    );
  }

  const planNames: Record<string, string> = {
    '200': 'Plano 200 Membros',
    '500': 'Plano 500 Membros',
    '800': 'Plano 800 Membros',
    'custom': 'Plano Personalizado',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Finalizar Assinatura
          </h1>
          <p className="text-gray-600">
            Você está prestes a assinar o <strong>{planNames[plan]}</strong>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Plano selecionado:</span>
            <span className="font-semibold text-gray-900">{planNames[plan]}</span>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Próximo passo:</strong> Você será redirecionado para a página de pagamento
              seguro do Stripe para finalizar sua assinatura.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin mr-2" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Continuar para Pagamento
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/')}
            className="w-full"
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Seu pagamento será processado de forma segura pelo Stripe.
            Você receberá um email de confirmação após o pagamento.
          </p>
        </div>
      </div>
    </div>
  );
}


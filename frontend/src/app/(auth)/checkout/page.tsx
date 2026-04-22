'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Loader, CreditCard, CheckCircle2, Check } from 'lucide-react';
// ACHADO 04: removido import direto de axios — usar apiService com interceptor de 401
import apiService from '@/services/api';

interface PlanOption {
  value: string;
  name: string;
  price: string;
  description?: string;
  members: number;
}

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  // ACHADO 03: desestruturar isLoading do AuthContext
  const { user, isLoading: isAuthLoading, refreshChurch } = useAuth();
  const initialPlan = searchParams.get('plan') as '100' | '200' | '500' | '800' | null;
  const [selectedPlan, setSelectedPlan] = useState<'100' | '200' | '500' | '800' | null>(
    initialPlan && ['100', '200', '500', '800'].includes(initialPlan) ? initialPlan : null
  );
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);

  // ACHADO 04: usar apiService.getPlans() — inclui interceptor de 401 automaticamente
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const data = await apiService.getPlans();
        const plans = data.plans.map((plan) => ({
          value: plan.id,
          name: plan.name,
          price: plan.priceFormatted + (plan.id !== '100' ? '/mês' : ''),
          description: plan.description,
          members: plan.members,
        }));
        setPlanOptions(plans);
      } catch {
        setPlanOptions([
          { value: '100', name: 'Plano 100 Membros', price: 'Gratuito', description: 'Ideal para começar', members: 100 },
          { value: '200', name: 'Plano 200 Membros', price: 'R$ 29,99/mês', description: 'Para igrejas pequenas', members: 200 },
          { value: '500', name: 'Plano 500 Membros', price: 'R$ 59,99/mês', description: 'Para igrejas médias', members: 500 },
          { value: '800', name: 'Plano 800 Membros', price: 'R$ 89,99/mês', description: 'Para igrejas grandes', members: 800 },
        ]);
      } finally {
        setIsLoadingPlans(false);
      }
    };
    loadPlans();
  }, []);

  useEffect(() => {
    // ACHADO 03: aguardar AuthContext inicializar antes de verificar autenticação.
    // Sem esse guard, user=null durante isAuthLoading=true causava redirect prematuro
    // para /login mesmo quando o usuário estava autenticado.
    if (isAuthLoading) return;

    if (!user) {
      const planToRedirect = initialPlan || selectedPlan;
      // ACHADO 11: encode correto do redirect URL — segundo '?' deve ser encodeURIComponent
      const redirectPath = planToRedirect ? `/checkout?plan=${planToRedirect}` : '/checkout';
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
    }
  }, [isAuthLoading, user, router, initialPlan, selectedPlan]);

  const handleCheckout = async () => {
    if (!selectedPlan) {
      setError('Por favor, selecione um plano antes de continuar');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (selectedPlan === '100') {
        // ACHADO 04: usar apiService (inclui withCredentials + interceptor de 401)
        // ACHADO 09: backend agora retorna 200 quando plano já está ativo (idempotente)
        await apiService.activateFreePlan();
        await refreshChurch();
        router.push('/');
        return;
      }

      // ACHADO 04: usar apiService para criar sessão de checkout
      const { url } = await apiService.createCheckoutSession(selectedPlan);

      if (!url) {
        throw new Error('URL de checkout não recebida');
      }

      window.location.href = url;
    } catch (err: unknown) {
      let errorMessage = 'Erro ao processar sua solicitação. Tente novamente.';
      let errorDetails = '';

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string; details?: string } } };
        if (axiosError.response?.data) {
          errorMessage = axiosError.response.data.error || errorMessage;
          errorDetails = axiosError.response.data.details || '';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      setIsLoading(false);
    }
  };

  // ACHADO 03: exibir loading durante inicialização do AuthContext
  if (isAuthLoading || isLoadingPlans) {
    return (
      <div className="flex items-center justify-center w-full">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-gray-600">Carregando planos...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const selectedPlanData = planOptions.find(p => p.value === selectedPlan);

  return (
    <div className="flex items-center justify-center w-full">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-3">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Escolha seu Plano</h1>
          <p className="text-sm text-gray-600">Selecione o plano ideal para sua igreja</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {planOptions.map((plan) => {
            const isSelected = selectedPlan === plan.value;
            const isFree = plan.value === '100';
            return (
              <button
                key={plan.value}
                onClick={() => setSelectedPlan(plan.value as '100' | '200' | '500' | '800')}
                className={`relative p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'
                }`}
              >
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5">
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-gray-900 mb-0.5 leading-tight">{plan.members}</h3>
                  <p className="text-xs text-gray-500 mb-2">membros</p>
                  <div className="flex flex-col items-center">
                    <span className={`text-base font-bold ${isFree ? 'text-green-600' : 'text-primary'}`}>
                      {isFree ? 'Grátis' : plan.price.split('/')[0]}
                    </span>
                    {!isFree && <span className="text-[10px] text-gray-500 mt-0.5">/mês</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedPlanData && (
          <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Plano selecionado</p>
                <p className="text-base font-semibold text-gray-900">{selectedPlanData.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">Valor</p>
                <p className={`text-lg font-bold ${selectedPlan === '100' ? 'text-green-600' : 'text-primary'}`}>
                  {selectedPlanData.price}
                </p>
              </div>
            </div>
            {selectedPlan !== '100' ? (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-blue-700">
                  <strong>Próximo passo:</strong> Você será redirecionado para a página de pagamento seguro do Stripe.
                </p>
              </div>
            ) : (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-green-700">
                  <strong>Plano Gratuito:</strong> Acesso imediato ao sistema sem necessidade de pagamento.
                </p>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleCheckout}
          disabled={isLoading || !selectedPlan}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader className="w-5 h-5 animate-spin mr-2" />
              Processando...
            </>
          ) : selectedPlan === '100' ? (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Acessar Sistema
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Continuar para Pagamento
            </>
          )}
        </Button>

        {selectedPlan !== '100' && (
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Seu pagamento será processado de forma segura pelo Stripe.
              Você receberá um email de confirmação após o pagamento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

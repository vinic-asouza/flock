'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Loader, CreditCard, CheckCircle2, XCircle, ArrowRight, Check } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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
  const { user, refreshChurch } = useAuth();
  const initialPlan = searchParams.get('plan') as '100' | '200' | '500' | '800' | 'custom' | null;
  const [selectedPlan, setSelectedPlan] = useState<'100' | '200' | '500' | '800' | 'custom' | null>(
    initialPlan && ['100', '200', '500', '800'].includes(initialPlan) ? initialPlan : null
  );
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);

  // Carregar planos da API
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await axios.get(`${API_URL}/plans`);
        const plans = response.data.plans.map((plan: any) => ({
          value: plan.id,
          name: plan.name,
          price: plan.priceFormatted + (plan.id !== '100' && plan.id !== 'custom' ? '/mês' : ''),
          description: plan.description,
          members: plan.members,
        }));
        setPlanOptions(plans);
      } catch (err) {
        console.error('Erro ao carregar planos:', err);
        // Fallback para planos padrão em caso de erro
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
    // Verificar se usuário está autenticado
    if (!user) {
      // Usar initialPlan da URL ou selectedPlan do estado
      const planToRedirect = initialPlan || selectedPlan;
      router.push('/login?redirect=/checkout' + (planToRedirect ? `?plan=${planToRedirect}` : ''));
      return;
    }

    // Se não houver plano selecionado e não houver plano inicial, definir padrão como 100
    if (!selectedPlan && !initialPlan) {
      setSelectedPlan('100');
    }
  }, [user, router, initialPlan, selectedPlan]);

  const handleCheckout = async () => {
    if (!selectedPlan) {
      setError('Por favor, selecione um plano');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Se for plano gratuito (100), ativar diretamente
      if (selectedPlan === '100') {
        const response = await axios.post(
          `${API_URL}/stripe/activate-free-plan`,
          {},
          {
            withCredentials: true,
          }
        );

        // Atualizar dados da igreja
        await refreshChurch();

        // Redirecionar para o sistema
        router.push('/');
        return;
      }

      // Para planos pagos, criar sessão de checkout
      const response = await axios.post(
        `${API_URL}/stripe/create-checkout-session`,
        { plan: selectedPlan },
        {
          withCredentials: true,
        }
      );

      const { url } = response.data;

      if (!url) {
        throw new Error('URL de checkout não recebida');
      }

      // Redirecionar para checkout do Stripe
      window.location.href = url;
    } catch (err: any) {
      console.error('Erro ao processar:', err);
      
      let errorMessage = 'Erro ao processar sua solicitação. Tente novamente.';
      let errorDetails = '';
      
      if (err.response?.data) {
        errorMessage = err.response.data.error || errorMessage;
        errorDetails = err.response.data.details || '';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(
        errorDetails 
          ? `${errorMessage}: ${errorDetails}`
          : errorMessage
      );
      setIsLoading(false);
    }
  };

  if (!user || isLoadingPlans) {
    return (
      <div className="flex items-center justify-center w-full">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-gray-600">Carregando planos...</p>
        </div>
      </div>
    );
  }

  const selectedPlanData = planOptions.find(p => p.value === selectedPlan);

  return (
    <div className="flex items-center justify-center w-full">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-3">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Escolha seu Plano
          </h1>
          <p className="text-sm text-gray-600">
            Selecione o plano ideal para sua igreja
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Seletor de Planos */}
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
                  <h3 className="text-sm font-semibold text-gray-900 mb-0.5 leading-tight">
                    {plan.members}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">membros</p>
                  <div className="flex flex-col items-center">
                    <span className={`text-base font-bold ${isFree ? 'text-green-600' : 'text-primary'}`}>
                      {isFree ? 'Grátis' : plan.price.split('/')[0]}
                    </span>
                    {!isFree && (
                      <span className="text-[10px] text-gray-500 mt-0.5">/mês</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Resumo do Plano Selecionado */}
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

        {/* Botão de Ação */}
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

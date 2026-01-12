'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader,
  ExternalLink,
  Calendar,
  Package,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Carregar planos da API (com fallback)
const loadPlanNames = async (): Promise<Record<string, string>> => {
  try {
    const response = await axios.get(`${API_URL}/plans`);
    const names: Record<string, string> = {};
    response.data.plans.forEach((plan: { id: string; name: string }) => {
      names[plan.id] = plan.name;
    });
    return names;
  } catch {
    // Fallback
    return {
      '100': 'Plano 100 Membros',
      '200': 'Plano 200 Membros',
      '500': 'Plano 500 Membros',
      '800': 'Plano 800 Membros',
    };
  }
};

const loadPlanPrices = async (): Promise<Record<string, string>> => {
  try {
    const response = await axios.get(`${API_URL}/plans`);
    const prices: Record<string, string> = {};
    response.data.plans.forEach((plan: { id: string; priceFormatted: string }) => {
      prices[plan.id] = plan.priceFormatted;
    });
    return prices;
  } catch {
    // Fallback
    return {
      '100': 'Gratuito',
      '200': 'R$ 29,99',
      '500': 'R$ 59,99',
      '800': 'R$ 89,99',
    };
  }
};

// Valores padrão (serão substituídos quando carregados)
const planNames: Record<string, string> = {
  '100': 'Plano 100 Membros',
  '200': 'Plano 200 Membros',
  '500': 'Plano 500 Membros',
  '800': 'Plano 800 Membros',
};

const planPrices: Record<string, string> = {
  '100': 'Gratuito',
  '200': 'R$ 29,99',
  '500': 'R$ 59,99',
  '800': 'R$ 89,99',
};

const statusLabels: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Ativa', color: 'text-green-700', bgColor: 'bg-green-50' },
  canceled: { label: 'Cancelada', color: 'text-red-700', bgColor: 'bg-red-50' },
  past_due: { label: 'Pagamento Atrasado', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  trialing: { label: 'Período de Teste', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  incomplete: { label: 'Incompleta', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  incomplete_expired: { label: 'Incompleta Expirada', color: 'text-red-700', bgColor: 'bg-red-50' },
  unpaid: { label: 'Não Paga', color: 'text-red-700', bgColor: 'bg-red-50' },
};

export function PaymentManagement() {
  const { user, refreshChurch } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  
  // Flag para garantir que a sincronização aconteça apenas uma vez
  const hasSyncedRef = useRef(false);
  const [planNamesState, setPlanNamesState] = useState(planNames);
  const [planPricesState, setPlanPricesState] = useState(planPrices);
  
  // Cache para sincronização (5 minutos)
  const SYNC_CACHE_KEY = 'stripe_sync_cache';
  const SYNC_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // Carregar planos da API ao montar componente
  useEffect(() => {
    const loadPlans = async () => {
      const names = await loadPlanNames();
      const prices = await loadPlanPrices();
      setPlanNamesState(names);
      setPlanPricesState(prices);
    };
    loadPlans();
  }, []);

  // Verificar se há cache válido de sincronização
  const getCachedSyncResult = (): { cached: boolean; timestamp: number } | null => {
    try {
      const cached = localStorage.getItem(SYNC_CACHE_KEY);
      if (!cached) return null;

      const { timestamp } = JSON.parse(cached);
      const now = Date.now();
      
      // Se cache ainda é válido (menos de 5 minutos)
      if (now - timestamp < SYNC_CACHE_DURATION) {
        return { cached: true, timestamp };
      }
      
      // Cache expirado, remover
      localStorage.removeItem(SYNC_CACHE_KEY);
      return null;
    } catch {
      return null;
    }
  };

  // Salvar resultado de sincronização no cache
  const setCachedSyncResult = () => {
    try {
      localStorage.setItem(SYNC_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
      }));
    } catch (error) {
      // Ignorar erros de localStorage (pode estar desabilitado)
      console.warn('Não foi possível salvar cache de sincronização:', error);
    }
  };

  const subscriptionStatus = user?.subscription_status;
  const planType = user?.plan_type;
  const subscriptionStartDate = user?.subscription_start_date;
  const subscriptionEndDate = user?.subscription_end_date;
  const hasSubscription = !!user?.stripe_subscription_id;

  // Verificar se a assinatura está realmente expirada
  const isSubscriptionExpired = () => {
    if (!subscriptionStatus || subscriptionStatus !== 'canceled') {
      return false;
    }
    
    // Se não há subscription_end_date, a assinatura está expirada
    if (!subscriptionEndDate) {
      return true;
    }
    
    // Se a data de término está no passado, a assinatura está expirada
    const endDate = new Date(subscriptionEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    return endDate <= today;
  };

  const handleReactivateSubscription = () => {
    // Redirecionar para checkout com o último plano que o usuário tinha (ou plano padrão)
    const planToReactivate = planType && planType !== '100' 
      ? planType 
      : '200'; // Plano padrão se não houver plano anterior válido
    
    router.push(`/checkout?plan=${planToReactivate}`);
  };

  useEffect(() => {
    // Simular carregamento inicial
    setIsLoading(false);
  }, []);

  // Sincronizar assinatura automaticamente ao entrar na aba de pagamento (apenas uma vez)
  useEffect(() => {
    // Verificar se já sincronizou ou se não há usuário para evitar múltiplas requisições
    if (hasSyncedRef.current || !user) {
      return;
    }
    
    const syncOnMount = async () => {
      // Marcar como sincronizado ANTES de fazer a requisição para evitar múltiplas execuções
      // mesmo que refreshChurch atualize o user e dispare o useEffect novamente
      hasSyncedRef.current = true;
      
      try {
        setIsSyncing(true);
        setError(null);
        setSyncMessage(null);

        const response = await axios.post(
          `${API_URL}/stripe/sync-subscription`,
          {},
          {
            withCredentials: true,
          }
        );

        if (response.data.synced) {
          // Atualizar dados do usuário silenciosamente (sem mostrar mensagem)
          // Como hasSyncedRef.current já é true, mesmo que refreshChurch atualize user,
          // o useEffect não será executado novamente
          if (refreshChurch) {
            await refreshChurch();
          }
        }
      } catch (err: unknown) {
        // Não mostrar erro na sincronização automática, apenas logar
        const errorMessage = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : err instanceof Error
          ? err.message
          : undefined;
        console.log('Sincronização automática:', errorMessage);
      } finally {
        setIsSyncing(false);
      }
    };

    syncOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Executar quando user estiver disponível, mas apenas uma vez devido ao ref

  const handleManageSubscription = async () => {
    try {
      setIsLoadingPortal(true);
      setError(null);

      const response = await axios.post(
        `${API_URL}/stripe/create-portal-session`,
        {},
        {
          withCredentials: true,
        }
      );

      const { url } = response.data;

      if (!url) {
        throw new Error('URL do portal não recebida');
      }

      // Abrir portal do Stripe em nova guia
      window.open(url, '_blank', 'noopener,noreferrer');
      setIsLoadingPortal(false);
    } catch (err: unknown) {
      console.error('Erro ao criar sessão do portal:', err);
      const errorMessage = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error ||
          (err as { message?: string }).message
        : undefined;
      setError(
        errorMessage ||
        'Erro ao acessar o portal de pagamento. Tente novamente.'
      );
      setIsLoadingPortal(false);
    }
  };

  const handleSyncSubscription = async (force: boolean = false) => {
    // Verificar cache antes de sincronizar (se não for forçado)
    if (!force) {
      const cache = getCachedSyncResult();
      if (cache?.cached) {
        setSyncMessage('Dados já sincronizados recentemente. Recarregue a página para forçar a atualização.');
        return;
      }
    }

    try {
      setIsSyncing(true);
      setError(null);
      setSyncMessage(null);

      const response = await axios.post(
        `${API_URL}/stripe/sync-subscription`,
        {},
        {
          withCredentials: true,
        }
      );

      if (response.data.synced) {
        setSyncMessage('Assinatura sincronizada com sucesso!');
        setSuccessMessage('Dados atualizados com sucesso!');
        
        // Salvar no cache
        setCachedSyncResult();
        
        // Atualizar dados do usuário
        if (refreshChurch) {
          await refreshChurch();
        } else {
          // Recarregar a página para atualizar os dados
          window.location.reload();
        }
        // Remover mensagem de sucesso após 5 segundos
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } else {
        setSyncMessage('Nenhuma assinatura encontrada no Stripe.');
        // Salvar no cache mesmo quando não há assinatura (evita requisições desnecessárias)
        setCachedSyncResult();
      }
    } catch (err: unknown) {
      console.error('Erro ao sincronizar assinatura:', err);
      const errorMessage = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error ||
          (err as { message?: string }).message
        : undefined;
      setError(
        errorMessage ||
        'Erro ao sincronizar assinatura. Tente novamente.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePlanSelection = async () => {
    if (!selectedPlan) {
      setError('Por favor, selecione um plano');
      return;
    }

    if (selectedPlan === planType) {
      setError('Você já está neste plano');
      return;
    }

    // Se o plano selecionado for o plano gratuito (100), redirecionar para o Customer Portal
    if (selectedPlan === '100') {
      try {
        setIsLoadingPortal(true);
        setError(null);

        const response = await axios.post(
          `${API_URL}/stripe/create-portal-session`,
          {},
          {
            withCredentials: true,
          }
        );

        const { url } = response.data;

        if (!url) {
          throw new Error('URL do portal não recebida');
        }

        // Fechar modal e redirecionar para o portal
        setShowChangePlanModal(false);
        setSelectedPlan(null);
        
        // Abrir portal do Stripe em nova guia
        window.open(url, '_blank', 'noopener,noreferrer');
        setIsLoadingPortal(false);
        return;
      } catch (err: unknown) {
        console.error('Erro ao criar sessão do portal:', err);
        const errorMessage = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error ||
            (err as { message?: string }).message
          : undefined;
        setError(
          errorMessage ||
          'Erro ao acessar o portal de pagamento. Tente novamente.'
        );
        setIsLoadingPortal(false);
        return;
      }
    }

    // Para outros planos, fechar modal de seleção e abrir modal de confirmação
    setShowChangePlanModal(false);
    setShowConfirmModal(true);
    setError(null);
  };

  const handleChangePlan = async () => {
    if (!selectedPlan) {
      setError('Por favor, selecione um plano');
      return;
    }

    // Confirmação adicional antes de trocar plano
    const currentPlanName = planNamesState[planType || ''] || planType || 'atual';
    const newPlanName = planNamesState[selectedPlan] || selectedPlan;
    
    const confirmed = window.confirm(
      `Tem certeza que deseja alterar de "${currentPlanName}" para "${newPlanName}"?\n\n` +
      'A alteração será aplicada imediatamente e você será cobrado proporcionalmente.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsChangingPlan(true);
      setError(null);
      setSyncMessage(null);

      await axios.post(
        `${API_URL}/stripe/change-plan`,
        { plan: selectedPlan },
        {
          withCredentials: true,
        }
      );

      setSuccessMessage('Plano alterado com sucesso!');
      setSyncMessage(null);
      setShowConfirmModal(false);
      setShowChangePlanModal(false);
      setSelectedPlan(null);

      // Atualizar dados do usuário
      if (refreshChurch) {
        await refreshChurch();
      } else {
        window.location.reload();
      }

      // Remover mensagem de sucesso após 5 segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: unknown) {
      console.error('Erro ao trocar plano:', err);
      const errorMessage = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string; details?: string } }; message?: string }).response?.data?.error ||
          (err as { response?: { data?: { details?: string } } }).response?.data?.details ||
          (err as { message?: string }).message
        : undefined;
      setError(
        errorMessage ||
        'Erro ao trocar plano. Tente novamente.'
      );
      setShowConfirmModal(false);
      setShowChangePlanModal(true);
    } finally {
      setIsChangingPlan(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Gerenciamento de Plano</h2>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie seu plano, assinatura e pagamentos.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem de sincronização */}
      {syncMessage && (
        <div className={`p-4 rounded-lg ${
          syncMessage.includes('sucesso') 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <p className={`text-sm ${
            syncMessage.includes('sucesso') 
              ? 'text-green-800' 
              : 'text-yellow-800'
          }`}>
            {syncMessage}
          </p>
        </div>
      )}

      {/* Mensagem de sucesso */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
            <p className="text-sm text-green-800 font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Status da Assinatura */}
      {hasSubscription ? (
        <>
          {/* Seção para assinatura expirada */}
          {isSubscriptionExpired() ? (
            <div className="bg-white rounded-lg border border-red-200 p-6 space-y-6">
              <div className="text-center py-6">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Assinatura Expirada
                </h3>
                <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                  Sua assinatura foi cancelada e já expirou. Agora você está usando o plano gratuito (Limite de 100 membros). Reative a assinatura para voltar ao plano pago.
                </p>
                {planType && (planType === '200' || planType === '500' || planType === '800') && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Último plano utilizado:</strong>
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {planNamesState[planType] || planType}
                      {planPricesState[planType] && (
                        <span className="text-sm text-gray-600 ml-2">
                          - {planPricesState[planType]}
                          <span className="text-gray-500">/mês</span>
                        </span>
                      )}
                    </p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={handleReactivateSubscription}
                    variant="primary"
                    className="w-full sm:w-auto"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Reativar Assinatura
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Você será redirecionado para a página de checkout onde poderá escolher um plano e realizar o pagamento.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
              {/* Status */}
              <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Status da Assinatura</h3>
            {(() => {
              // Verificar se há data de encerramento no futuro (assinatura cancelada mas ainda ativa)
              const hasFutureEndDate = subscriptionEndDate && (() => {
                const endDate = new Date(subscriptionEndDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);
                return endDate > today;
              })();

              // Não exibir status se houver data de encerramento futura
              if (hasFutureEndDate) {
                return null;
              }

              // Exibir status normalmente
              if (subscriptionStatus && statusLabels[subscriptionStatus]) {
                return (
                  <div className={`inline-flex items-center px-3 py-1 rounded-full ${statusLabels[subscriptionStatus].bgColor}`}>
                    {subscriptionStatus === 'active' && <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />}
                    {subscriptionStatus === 'canceled' && <XCircle className="w-4 h-4 mr-2 text-red-600" />}
                    {subscriptionStatus === 'past_due' && <AlertCircle className="w-4 h-4 mr-2 text-yellow-600" />}
                    <span className={`text-sm font-medium ${statusLabels[subscriptionStatus].color}`}>
                      {statusLabels[subscriptionStatus].label}
                    </span>
                  </div>
                );
              }

              return <span className="text-sm text-gray-500">Status não disponível</span>;
            })()}
            
            {/* Alerta para assinatura cancelada (verifica subscription_end_date) */}
            {subscriptionEndDate && (() => {
              // Verificar se a data de encerramento está no futuro (assinatura cancelada mas ainda ativa)
              const endDate = new Date(subscriptionEndDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de data
              endDate.setHours(0, 0, 0, 0);
              const isCanceled = endDate > today;
              
              return isCanceled ? (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 mb-1">
                        Assinatura Cancelada
                      </p>
                      <p className="text-sm text-amber-800">
                        Sua assinatura foi cancelada, mas você continuará tendo acesso ao plano pago até{' '}
                        <strong>{formatDate(subscriptionEndDate)}</strong>. 
                        Após essa data, o acesso mudará para o plano gratuito.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
          </div>

          {/* Plano Atual */}
          {planType && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Plano Atual</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Package className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <span className="text-lg font-semibold text-gray-900">
                      {planNamesState[planType] || planType}
                    </span>
                    {planPricesState[planType] && (
                      <span className="text-sm text-gray-600 ml-2">
                        - {planPricesState[planType]}
                        {planType && planType !== '100' && <span className="text-gray-500">/mês</span>}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptionStartDate && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Data de Início</h3>
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">
                    {formatDate(subscriptionStartDate)}
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* Botões de Ação */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
                className="flex-1"
              >
                {isLoadingPortal ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Gerenciar Assinatura
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              {!subscriptionEndDate && (
                <Button
                  onClick={() => setShowChangePlanModal(true)}
                  disabled={isChangingPlan || subscriptionStatus !== 'active'}
                  variant="secondary"
                  className="flex-1"
                >
                  <ArrowUpDown className="w-5 h-5 mr-2" />
                  Trocar de Plano
                </Button>
              )}
              <Button
                onClick={() => handleSyncSubscription(false)}
                disabled={isSyncing}
                variant="secondary"
                className="flex-1"
              >
                {isSyncing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <Loader className="w-5 h-5 mr-2" />
                    Sincronizar Assinatura
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              <strong>Gerenciar Assinatura:</strong> Acesse o portal do Stripe para atualizar método de pagamento, cancelar ou alterar plano.
              {!subscriptionEndDate && (
                <>
                  <br />
                  <strong>Trocar de Plano:</strong> Altere seu plano atual para outro disponível (apenas para assinaturas ativas).
                </>
              )}
              <br />
              <strong>Sincronizar:</strong> Atualize os dados da assinatura diretamente do Stripe (útil se o webhook não processou corretamente).
            </p>
          </div>
        </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma Assinatura Ativa
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {user?.stripe_customer_id 
                ? 'Não foi encontrada uma assinatura ativa no sistema. Se você acabou de fazer o pagamento, tente sincronizar.'
                : 'Você está usando o plano gratuito (Limite de 100 membros). Faça uma assinatura para ativar o plano pago (Limite de 200 membros).'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {user?.stripe_customer_id && (
                <Button
                  onClick={() => handleSyncSubscription(false)}
                  disabled={isSyncing}
                  variant="secondary"
                  className="w-full sm:w-auto"
                  title="Sincroniza apenas se não houver cache válido (últimos 5 minutos)"
                >
                  {isSyncing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <Loader className="w-5 h-5 mr-2" />
                      Sincronizar Assinatura
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={() => window.location.href = '/checkout?plan=200'}
                className="w-full sm:w-auto"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Assinar Plano
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Informações Adicionais */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Sobre o Portal de Pagamento</p>
            <p className="text-blue-700">
              No portal do Stripe você pode atualizar seu método de pagamento, visualizar faturas anteriores, 
              cancelar ou alterar seu plano. Todas as alterações são processadas de forma segura.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Troca de Plano */}
      <Modal
        isOpen={showChangePlanModal}
        onClose={() => {
          setShowChangePlanModal(false);
          setSelectedPlan(null);
          setError(null);
        }}
        title="Trocar de Plano"
        size="md"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Selecione o novo plano para sua assinatura. A alteração será aplicada imediatamente e você será cobrado proporcionalmente.
          </p>

          <div className="space-y-2">
            {(['100', '200', '500', '800'] as const).map((planKey) => {
              const isCurrentPlan = planType === planKey;
              const isSelected = selectedPlan === planKey;

              return (
                <button
                  key={planKey}
                  onClick={() => setSelectedPlan(planKey)}
                  disabled={isCurrentPlan}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    isCurrentPlan
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                      : isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {planNamesState[planKey]}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {planPricesState[planKey]}
                        {planKey !== '100' && <span className="text-gray-500"> /mês</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrentPlan && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Plano Atual</span>
                      )}
                      {isSelected && !isCurrentPlan && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Observação para plano gratuito */}
          {selectedPlan === '100' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Para alterar para o plano gratuito você precisa cancelar a assinatura atual, clique e continuar para ser redirecionado para o gerenciamento de assinatura e faça o cancelamento.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => {
                setShowChangePlanModal(false);
                setSelectedPlan(null);
                setError(null);
              }}
              variant="secondary"
              className="flex-1"
              disabled={isChangingPlan}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePlanSelection}
              disabled={!selectedPlan || isChangingPlan || selectedPlan === planType || isLoadingPortal}
              className="flex-1"
            >
              {isLoadingPortal ? (
                <>
                  <Loader className="w-5 h-5 animate-spin mr-2" />
                  Carregando...
                </>
              ) : (
                <>
                  <ArrowUpDown className="w-5 h-5 mr-2" />
                  Continuar
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmação */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setShowChangePlanModal(true);
        }}
        title="Confirmar Troca de Plano"
        size="md"
      >
        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Atenção: Alteração Imediata</p>
                <p>
                  A troca de plano será aplicada imediatamente. Você será cobrado proporcionalmente 
                  pelo período restante do plano atual e pelo novo plano.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Plano Atual */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Plano Atual</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {planType ? planNamesState[planType] : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {planType ? planPricesState[planType] : 'N/A'} <span className="text-gray-500">/mês</span>
                  </p>
                </div>
                <XCircle className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Seta */}
            <div className="flex justify-center">
              <ArrowUpDown className="w-6 h-6 text-primary" />
            </div>

            {/* Novo Plano */}
            <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary">
              <p className="text-xs text-primary mb-2">Novo Plano</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedPlan ? planNamesState[selectedPlan] : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedPlan ? planPricesState[selectedPlan] : 'N/A'} <span className="text-gray-500">/mês</span>
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
            </div>
          </div>

          {/* Informação sobre cobrança */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Como funciona a cobrança:</strong> O Stripe calculará automaticamente o valor proporcional 
              do plano atual e aplicará o novo plano. Você receberá uma fatura ajustada.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => {
                setShowConfirmModal(false);
                setShowChangePlanModal(true);
              }}
              variant="secondary"
              className="flex-1"
              disabled={isChangingPlan}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={!selectedPlan || isChangingPlan}
              className="flex-1"
            >
              {isChangingPlan ? (
                <>
                  <Loader className="w-5 h-5 animate-spin mr-2" />
                  Alterando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Confirmar Troca
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


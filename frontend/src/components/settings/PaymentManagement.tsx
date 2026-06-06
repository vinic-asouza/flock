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
import apiService, { formatApiError } from '@/services/api';
import {
  getCachedStripeSync,
  setCachedStripeSync,
} from '@/utils/stripeSyncCache';
import { captureBillingError } from '@/utils/billingTelemetry';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import toast from 'react-hot-toast';

// Carregar planos da API (com fallback)
const loadPlanNames = async (): Promise<Record<string, string>> => {
  try {
    const { plans } = await apiService.getPlans();
    const names: Record<string, string> = {};
    plans.forEach((plan) => {
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
    const { plans } = await apiService.getPlans();
    const prices: Record<string, string> = {};
    plans.forEach((plan) => {
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

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

const eventTypeLabels: Record<string, string> = {
  subscription_created: 'Assinatura criada',
  plan_changed: 'Plano alterado',
  activate_free: 'Plano gratuito ativado',
  downgrade_job: 'Downgrade automático',
};

export function PaymentManagement() {
  const { user, refreshChurch, currentRole, activeChurchId } = useAuth();
  const canManagePlan = currentRole === 'admin' || currentRole === 'owner';
  const router = useRouter();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [autoSyncFailed, setAutoSyncFailed] = useState(false);
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  
  // Flag para garantir que a sincronização aconteça apenas uma vez
  const hasSyncedRef = useRef(false);
  const lastSyncedChurchIdRef = useRef<string | null>(null);
  const [planNamesState, setPlanNamesState] = useState(planNames);
  const [planPricesState, setPlanPricesState] = useState(planPrices);
  const [subscriptionEvents, setSubscriptionEvents] = useState<
    Awaited<ReturnType<typeof apiService.getSubscriptionEvents>>['events']
  >([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

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

  const subscriptionStatus = user?.subscription_status;
  const isPastDue = subscriptionStatus === 'past_due';
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

  // FB12: resetar auto-sync ao trocar igreja ativa
  useEffect(() => {
    const churchKey = activeChurchId ?? user?.id ?? null;
    if (lastSyncedChurchIdRef.current !== churchKey) {
      hasSyncedRef.current = false;
      lastSyncedChurchIdRef.current = churchKey;
    }
  }, [activeChurchId, user?.id]);

  // Auto-sync ao abrir aba (uma vez por igreja; respeita cache de 5 min — FB06)
  useEffect(() => {
    if (hasSyncedRef.current || !user || !canManagePlan) {
      return;
    }

    const churchKey = activeChurchId ?? user.id;

    const syncOnMount = async () => {
      hasSyncedRef.current = true;

      if (getCachedStripeSync(churchKey)) {
        return;
      }

      try {
        setIsSyncing(true);
        setAutoSyncFailed(false);
        const response = await apiService.syncSubscription();
        if (response.synced && refreshChurch) {
          await refreshChurch();
        }
        setCachedStripeSync(churchKey);
      } catch (err: unknown) {
        setAutoSyncFailed(true);
        captureBillingError('billing_sync_failed', {
          church_id: churchKey,
          error_code: formatApiError(err) || 'auto_sync_failed',
          source: 'auto_sync_on_mount',
        });
      } finally {
        setIsSyncing(false);
      }
    };

    syncOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.stripe_customer_id, activeChurchId, canManagePlan]);

  useEffect(() => {
    if (!canManagePlan || !activeChurchId) return;

    const loadEvents = async () => {
      setIsLoadingEvents(true);
      setEventsError(null);
      try {
        const { events } = await apiService.getSubscriptionEvents({ limit: 10 });
        setSubscriptionEvents(events);
      } catch (err: unknown) {
        setEventsError(formatApiError(err) || 'Não foi possível carregar o histórico');
      } finally {
        setIsLoadingEvents(false);
      }
    };

    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeChurchId]);

  // FB05: atualizar dados ao voltar da aba do portal Stripe
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && refreshChurch) {
        void refreshChurch();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshChurch]);

  const handleManageSubscription = async () => {
    try {
      setIsLoadingPortal(true);
      setError(null);

      const { url } = await apiService.createPortalSession();

      if (!url) {
        throw new Error('URL do portal não recebida');
      }

      // Abrir portal do Stripe em nova guia
      window.open(url, '_blank', 'noopener,noreferrer');
      setIsLoadingPortal(false);
    } catch (err: unknown) {
      const finalMessage = formatApiError(err) || 'Erro ao acessar o portal de pagamento. Tente novamente.';
      toast.error(finalMessage);
      setError(finalMessage);
      setIsLoadingPortal(false);
    }
  };

  const handleSyncSubscription = async (force: boolean = false) => {
    const churchKey = activeChurchId ?? user?.id;

    if (!force && churchKey && getCachedStripeSync(churchKey)) {
      setSyncMessage('Dados já sincronizados recentemente. Use "Sincronizar agora" no aviso acima ou aguarde alguns minutos.');
      return;
    }

    try {
      setIsSyncing(true);
      setError(null);
      setSyncMessage(null);

      setAutoSyncFailed(false);

      const response = await apiService.syncSubscription();

      if (response.synced) {
        setSyncMessage('Assinatura sincronizada com sucesso!');
        setSuccessMessage('Dados atualizados com sucesso!');
        
        if (churchKey) {
          setCachedStripeSync(churchKey);
        }
        
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
        if (churchKey) {
          setCachedStripeSync(churchKey);
        }
      }
    } catch (err: unknown) {
      const errorMessage = formatApiError(err);
      captureBillingError('billing_sync_failed', {
        church_id: activeChurchId ?? undefined,
        error_code: errorMessage || 'manual_sync_failed',
        source: 'manual_sync',
      });
      toast.error(errorMessage);
      setError(errorMessage || 'Erro ao sincronizar assinatura. Tente novamente.');
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

    // FB04: plano gratuito — confirmar no modal e usar activate-free-plan (igual ao checkout)
    if (selectedPlan === '100') {
      setShowChangePlanModal(false);
      setShowConfirmModal(true);
      setError(null);
      return;
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

    try {
      setIsChangingPlan(true);
      setError(null);
      setSyncMessage(null);

      if (selectedPlan === '100') {
        await apiService.activateFreePlan();
      } else {
        await apiService.changePlan(selectedPlan);
      }

      setSuccessMessage(
        selectedPlan === '100'
          ? 'Plano gratuito ativado com sucesso!'
          : 'Plano alterado com sucesso!'
      );
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
      const finalMessage = formatApiError(err) || 'Erro ao trocar plano. Tente novamente.';
      toast.error(finalMessage);
      setError(finalMessage);
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

  if (!user) {
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

      {isPastDue && (
        <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Pagamento pendente</p>
                <p className="text-sm text-yellow-800 mt-1">
                  Atualize sua forma de pagamento no portal Stripe para evitar interrupção do serviço.
                  Novos membros não podem ser adicionados até a regularização.
                </p>
              </div>
            </div>
            <Button
              onClick={handleManageSubscription}
              disabled={isLoadingPortal || !canManagePlan}
              title={!canManagePlan ? READER_TOOLTIP : undefined}
              className="shrink-0"
              isLoading={isLoadingPortal}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Atualizar pagamento
            </Button>
          </div>
        </div>
      )}

      {autoSyncFailed && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                Não foi possível sincronizar a assinatura automaticamente
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Os dados exibidos podem estar desatualizados. Use o botão abaixo para tentar novamente.
              </p>
              <Button
                onClick={() => handleSyncSubscription(true)}
                variant="secondary"
                className="mt-3"
                disabled={isSyncing}
              >
                {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
              </Button>
            </div>
          </div>
        </div>
      )}

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
                disabled={isLoadingPortal || isSyncing || isChangingPlan || !canManagePlan}
                title={!canManagePlan ? READER_TOOLTIP : undefined}
                className="flex-1"
                isLoading={isLoadingPortal}
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
                  disabled={isChangingPlan || subscriptionStatus !== 'active' || isLoadingPortal || isSyncing || !canManagePlan}
                  title={!canManagePlan ? READER_TOOLTIP : undefined}
                  variant="secondary"
                  className="flex-1"
                  isLoading={isChangingPlan}
                >
                  <ArrowUpDown className="w-5 h-5 mr-2" />
                  Trocar de Plano
                </Button>
              )}
              <Button
                onClick={() => handleSyncSubscription(false)}
                disabled={isSyncing || isLoadingPortal || isChangingPlan || !canManagePlan}
                title={!canManagePlan ? READER_TOOLTIP : undefined}
                variant="secondary"
                className="flex-1"
                isLoading={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
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
                : 'Você está usando o plano gratuito (Limite de 100 membros). Faça uma assinatura para ativar um dos planos pagos.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {user?.stripe_customer_id && (
                <Button
                  onClick={() => handleSyncSubscription(false)}
                  disabled={isSyncing || !canManagePlan}
                  title={!canManagePlan ? READER_TOOLTIP : 'Sincroniza apenas se não houver cache válido (últimos 5 minutos)'}
                  variant="secondary"
                  className="w-full sm:w-auto"
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
                disabled={!canManagePlan}
                title={!canManagePlan ? READER_TOOLTIP : undefined}
                className="w-full sm:w-auto"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Assinar Plano
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de assinatura (admin/owner) */}
      {canManagePlan && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Histórico de assinatura</h3>
            <span className="text-xs text-gray-500">Criações e alterações de plano</span>
          </div>

          {isLoadingEvents ? (
            <div className="flex items-center justify-center py-6">
              <Loader className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : eventsError ? (
            <p className="text-sm text-amber-700">{eventsError}</p>
          ) : subscriptionEvents.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum evento registrado ainda.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {subscriptionEvents.map((evt) => (
                <li key={evt.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {eventTypeLabels[evt.event_type] ?? evt.event_type}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {evt.old_plan && evt.new_plan && evt.old_plan !== evt.new_plan
                          ? `Plano ${evt.old_plan} → ${evt.new_plan}`
                          : evt.new_plan
                          ? `Plano ${evt.new_plan}`
                          : evt.old_plan
                          ? `Plano ${evt.old_plan}`
                          : '—'}
                        {evt.old_status || evt.new_status
                          ? ` · ${evt.old_status ?? '—'} → ${evt.new_status ?? '—'}`
                          : ''}
                      </p>
                    </div>
                    <time className="text-xs text-gray-400 shrink-0">
                      {formatDate(evt.created_at)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
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
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  O plano gratuito cancelará sua assinatura paga no Stripe imediatamente. Você passará ao limite de 100 membros.
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
        title={selectedPlan === '100' ? 'Confirmar Plano Gratuito' : 'Confirmar Troca de Plano'}
        size="md"
      >
        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                {selectedPlan === '100' ? (
                  <>
                    <p className="font-medium mb-1">Atenção: cancelamento da assinatura paga</p>
                    <p>
                      Sua assinatura no Stripe será cancelada e o plano gratuito (100 membros) será ativado
                      imediatamente.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium mb-1">Atenção: Alteração Imediata</p>
                    <p>
                      A troca de plano será aplicada imediatamente. Você será cobrado proporcionalmente
                      pelo período restante do plano atual e pelo novo plano.
                    </p>
                  </>
                )}
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

          {selectedPlan !== '100' && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Como funciona a cobrança:</strong> O Stripe calculará automaticamente o valor proporcional
                do plano atual e aplicará o novo plano. Você receberá uma fatura ajustada.
              </p>
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
                  {selectedPlan === '100' ? 'Ativar Plano Gratuito' : 'Confirmar Troca'}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


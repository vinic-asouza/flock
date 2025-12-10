import supabase from '../services/supabase';

/**
 * Limites de membros por tipo de plano
 */
const PLAN_LIMITS: Record<string, number> = {
  '100': 100, // Plano gratuito
  '200': 200,
  '500': 500,
  '800': 800,
  'custom': Infinity, // Plano customizado sem limite
};

/**
 * Resultado da verificação de limite de membros
 */
export interface MemberLimitCheck {
  canAdd: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  planType?: string | null;
  subscriptionStatus?: string | null;
  hasActiveSubscription: boolean;
  message?: string;
}

/**
 * Verifica se a igreja pode adicionar mais membros baseado no plano
 * @param churchId ID da igreja
 * @param quantityToAdd Quantidade de membros que se deseja adicionar (padrão: 1)
 * @returns Informações sobre o limite e se pode adicionar
 */
export async function checkMemberLimit(
  churchId: string,
  quantityToAdd: number = 1
): Promise<MemberLimitCheck> {
  try {
    // Buscar dados da igreja (plano e status de assinatura)
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, plan_type, subscription_status')
      .eq('id', churchId)
      .single();

    if (churchError || !church) {
      return {
        canAdd: false,
        currentCount: 0,
        limit: 0,
        remaining: 0,
        hasActiveSubscription: false,
        message: 'Igreja não encontrada',
      };
    }

    const planType = church.plan_type;
    const subscriptionStatus = church.subscription_status;

    // Se não tem plano, permitir sem limite
    if (!planType) {
      return {
        canAdd: true,
        currentCount: 0,
        limit: Infinity,
        remaining: Infinity,
        planType: null,
        subscriptionStatus: null,
        hasActiveSubscription: false,
      };
    }

    // Verificar se a assinatura está ativa
    const hasActiveSubscription = subscriptionStatus === 'active';

    // Se não tem assinatura ativa, ainda permitir (pode ser período de teste ou cancelamento futuro)
    // Mas vamos verificar o limite mesmo assim
    const limit = PLAN_LIMITS[planType] ?? Infinity;

    // Se o limite é infinito (plano custom), permitir sempre
    if (limit === Infinity) {
      return {
        canAdd: true,
        currentCount: 0,
        limit: Infinity,
        remaining: Infinity,
        planType,
        subscriptionStatus,
        hasActiveSubscription,
      };
    }

    // Contar membros ativos da igreja
    const { count: currentCount, error: countError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('active', true);

    if (countError) {
      console.error('Erro ao contar membros:', countError);
      return {
        canAdd: false,
        currentCount: 0,
        limit,
        remaining: 0,
        planType,
        subscriptionStatus,
        hasActiveSubscription,
        message: 'Erro ao verificar limite de membros',
      };
    }

    const totalCount = currentCount || 0;
    const remaining = Math.max(0, limit - totalCount);
    // Se quantityToAdd é 0, verificar se ainda há espaço disponível (remaining > 0)
    // Se quantityToAdd > 0, verificar se a adição não ultrapassa o limite
    const canAdd = quantityToAdd === 0 
      ? remaining > 0 
      : totalCount + quantityToAdd <= limit;

    let message: string | undefined;
    if (!canAdd) {
      if (!hasActiveSubscription) {
        message = `Limite de membros atingido. Você possui ${totalCount} de ${limit} membros permitidos no plano ${planType}. Ative sua assinatura para continuar adicionando membros.`;
      } else {
        message = `Limite de membros atingido. Você possui ${totalCount} de ${limit} membros permitidos no plano ${planType}. Faça upgrade para adicionar mais membros.`;
      }
    }

    return {
      canAdd,
      currentCount: totalCount,
      limit,
      remaining,
      planType,
      subscriptionStatus,
      hasActiveSubscription,
      message,
    };
  } catch (error) {
    console.error('Erro ao verificar limite de membros:', error);
    return {
      canAdd: false,
      currentCount: 0,
      limit: 0,
      remaining: 0,
      hasActiveSubscription: false,
      message: 'Erro ao verificar limite de membros',
    };
  }
}


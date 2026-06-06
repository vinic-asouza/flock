import { supabaseAdmin } from '../services/supabase';

// Todas as queries de DB usam service_role (bypassa RLS)
const supabase = supabaseAdmin;
import { sendEmail } from '../services/emailService';
import { getMemberLimitWarningTemplate } from '../templates/emailTemplates';
import { getPlanName, getPlanConfig } from '../config/plans';

/**
 * Função auxiliar para buscar o email do usuário a partir do user_id da igreja
 */
async function getUserEmailFromChurch(churchId: string): Promise<string | null> {
  try {
    // Buscar user_id da igreja
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('user_id')
      .eq('id', churchId)
      .single();

    if (churchError || !church || !church.user_id) {
      console.error('Erro ao buscar user_id da igreja:', churchError);
      return null;
    }

    // Buscar email do usuário através do user_id
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(church.user_id);
    
    if (userError || !user || !user.email) {
      console.error('Erro ao buscar email do usuário:', userError);
      return null;
    }

    return user.email;
  } catch (error) {
    console.error('Erro ao buscar email do usuário:', error);
    return null;
  }
}

/**
 * Limites de membros por tipo de plano
 */
const PLAN_LIMITS: Record<string, number> = {
  '100': 100, // Plano gratuito
  '200': 200,
  '500': 500,
  '800': 800,
};

/**
 * Cache para rastrear avisos de limite enviados
 * Formato: { "churchId:threshold": timestamp }
 * Exemplo: { "abc123:80": 1234567890, "abc123:90": 1234567891 }
 */
const limitWarningCache = new Map<string, number>();

/**
 * Limpar cache de avisos antigos (mais de 7 dias)
 */
const CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of limitWarningCache.entries()) {
    if (now - timestamp > CLEANUP_INTERVAL) {
      limitWarningCache.delete(key);
    }
  }
}, 24 * 60 * 60 * 1000); // Limpar diariamente

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
  isPastDue?: boolean;
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

    // SL05: assinatura "com direito" inclui active e trialing; past_due entra em grace period
    const hasActiveSubscription =
      subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

    // SL05: past_due = grace period — mantém limites do plano mas bloqueia adição de novos membros
    const isPastDue = subscriptionStatus === 'past_due';

    const limit = PLAN_LIMITS[planType] ?? Infinity;

    // Se o limite é infinito (plano não definido), permitir sempre
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

    // SL05: past_due = grace period — bloqueia adição independente de limite numérico
    const blockedByPastDue = isPastDue && quantityToAdd > 0;

    const withinLimit =
      quantityToAdd === 0 ? remaining > 0 : totalCount + quantityToAdd <= limit;

    const canAdd = !blockedByPastDue && withinLimit;

    let message: string | undefined;
    if (blockedByPastDue) {
      message = `Pagamento pendente. Regularize sua assinatura para adicionar novos membros.`;
    } else if (!canAdd) {
      if (!hasActiveSubscription) {
        message = `Limite de membros atingido. Você possui ${totalCount} de ${limit} membros permitidos no plano ${planType}. Ative sua assinatura para continuar adicionando membros.`;
      } else {
        message = `Limite de membros atingido. Você possui ${totalCount} de ${limit} membros permitidos no plano ${planType}. Faça upgrade para adicionar mais membros.`;
      }
    }

    // Verificar e enviar avisos de limite (80%, 90%, 100%)
    // Apenas se tiver plano definido e limite finito
    if (planType && limit !== Infinity && totalCount > 0) {
      const percentage = Math.round((totalCount / limit) * 100);
      const thresholds = [100, 90, 80]; // Verificar do maior para o menor
      
      // Encontrar o threshold mais alto atingido que ainda não foi notificado
      let thresholdToNotify: number | null = null;
      const now = Date.now();
      
      for (const threshold of thresholds) {
        if (percentage >= threshold) {
          const cacheKey = `${churchId}:${threshold}`;
          const lastSent = limitWarningCache.get(cacheKey);
          
          // Se não foi enviado nos últimos 7 dias, este é o threshold a notificar
          if (!lastSent || (now - lastSent) > CLEANUP_INTERVAL) {
            thresholdToNotify = threshold;
            break; // Usar o threshold mais alto atingido
          }
        }
      }
      
      // Enviar email apenas se encontrou um threshold para notificar
      if (thresholdToNotify !== null) {
        // Buscar informações completas da igreja para o email
        const { data: churchData } = await supabase
          .from('churches')
          .select('name')
          .eq('id', churchId)
          .single();

        if (churchData) {
          try {
            // Buscar email do usuário
            const userEmail = await getUserEmailFromChurch(churchId);
            if (!userEmail) {
              console.warn(`Não foi possível encontrar email do usuário para a igreja ${churchId}`);
              // Continuar sem enviar email, mas não quebrar o fluxo
            } else {
              const planConfig = getPlanConfig(planType);
              const planName = planConfig?.name || getPlanName(planType);
              const isLimitReached = thresholdToNotify >= 100;
              
              // Determinar cores e título baseado no threshold
              let warningTitle: string;
              let warningColor: string;
              let borderColor: string;
              
              if (isLimitReached) {
                warningTitle = '⚠️ Limite de Membros Atingido';
                warningColor = '#fee2e2';
                borderColor = '#ef4444';
              } else if (thresholdToNotify >= 90) {
                warningTitle = '⚠️ Limite de Membros Próximo (90%)';
                warningColor = '#fff7ed';
                borderColor = '#f59e0b';
              } else {
                warningTitle = 'ℹ️ Limite de Membros Próximo (80%)';
                warningColor = '#fef3c7';
                borderColor = '#fbbf24';
              }

              const userName = churchData.name || userEmail.split('@')[0] || 'Usuário';

              await sendEmail({
                to: userEmail,
                subject: isLimitReached 
                  ? 'Limite de Membros Atingido - Flock' 
                  : `Aviso: ${percentage}% do Limite de Membros - Flock`,
                html: getMemberLimitWarningTemplate({
                  userName,
                  currentCount: totalCount,
                  limit,
                  remaining,
                  planName,
                  percentage,
                  warningTitle,
                  warningColor,
                  borderColor,
                  isLimitReached,
                }),
              });

              // Atualizar cache
              const cacheKey = `${churchId}:${thresholdToNotify}`;
              limitWarningCache.set(cacheKey, now);
            }
          } catch (emailError) {
            // Logar erro mas não quebrar o fluxo
            console.error(`Erro ao enviar aviso de limite (${thresholdToNotify}%):`, emailError);
          }
        }
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
      isPastDue,
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


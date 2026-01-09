import supabase, { supabaseAdmin } from '../services/supabase';
import { sendEmail } from '../services/emailService';
import { getSubscriptionExpiringWarningTemplate } from '../templates/stripeEmailTemplates';
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
    if (!supabaseAdmin) {
      console.error('supabaseAdmin não configurado');
      return null;
    }

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
 * Cache para rastrear avisos de expiração enviados
 * Formato: { "churchId:daysBefore": timestamp }
 * Exemplo: { "abc123:7": 1234567890, "abc123:3": 1234567891, "abc123:1": 1234567892 }
 */
const expirationWarningCache = new Map<string, number>();

/**
 * Limpar cache de avisos antigos (mais de 30 dias)
 */
const CLEANUP_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 dias em milissegundos

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of expirationWarningCache.entries()) {
    if (now - timestamp > CLEANUP_INTERVAL) {
      expirationWarningCache.delete(key);
    }
  }
}, 24 * 60 * 60 * 1000); // Limpar diariamente

/**
 * Calcula quantos dias faltam até uma data
 */
function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Formata a quantidade de dias restantes
 */
function formatDaysRemaining(days: number): string {
  if (days === 1) {
    return '1 dia';
  } else if (days === 0) {
    return 'hoje';
  } else if (days < 0) {
    return 'expirado';
  }
  return `${days} dias`;
}

/**
 * Verifica assinaturas próximas do vencimento e envia avisos
 * @returns Número de avisos enviados
 */
export async function checkSubscriptionExpiration(): Promise<number> {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);

    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(now.getDate() + 1);
    oneDayFromNow.setHours(23, 59, 59, 999);

    // Buscar igrejas com assinaturas que expiram em 7, 3 ou 1 dia
    // Apenas assinaturas canceladas com data de término definida
    const { data: churches, error } = await supabase
      .from('churches')
      .select('id, name, plan_type, subscription_status, subscription_end_date')
      .eq('subscription_status', 'canceled')
      .not('subscription_end_date', 'is', null)
      .lte('subscription_end_date', sevenDaysFromNow.toISOString())
      .gte('subscription_end_date', now.toISOString());

    if (error) {
      console.error('Erro ao buscar assinaturas próximas do vencimento:', error);
      return 0;
    }

    if (!churches || churches.length === 0) {
      console.log('ℹ️ Nenhuma assinatura próxima do vencimento encontrada');
      return 0;
    }

    let emailsSent = 0;
    const nowTimestamp = Date.now();

    for (const church of churches) {
      if (!church.subscription_end_date) {
        continue;
      }

      // Buscar email do usuário
      const userEmail = await getUserEmailFromChurch(church.id);
      if (!userEmail) {
        console.warn(`Não foi possível encontrar email do usuário para a igreja ${church.id}`);
        continue;
      }

      const expirationDate = new Date(church.subscription_end_date);
      const daysRemaining = daysUntil(expirationDate);

      // Verificar quais thresholds devem ser notificados (7, 3, 1 dias)
      const thresholds = [7, 3, 1];
      let thresholdToNotify: number | null = null;

      for (const threshold of thresholds) {
        // Verificar se está dentro da janela de tempo para este threshold
        // Ex: para 7 dias, verificar se está entre 7 e 6 dias
        if (daysRemaining <= threshold && daysRemaining > threshold - 1) {
          const cacheKey = `${church.id}:${threshold}`;
          const lastSent = expirationWarningCache.get(cacheKey);

          // Enviar apenas se não foi enviado nos últimos 2 dias
          if (!lastSent || (nowTimestamp - lastSent) > (2 * 24 * 60 * 60 * 1000)) {
            thresholdToNotify = threshold;
            break;
          }
        }
      }

      // Se encontrou um threshold para notificar, enviar email
      if (thresholdToNotify !== null) {
        try {
          const planConfig = getPlanConfig(church.plan_type);
          const planName = planConfig?.name || getPlanName(church.plan_type) || 'Plano atual';
          
          const expirationDateFormatted = expirationDate.toLocaleDateString('pt-BR', {
            dateStyle: 'long',
            timeZone: 'America/Sao_Paulo'
          });

          const daysRemainingFormatted = formatDaysRemaining(daysRemaining);
          const isUrgent = thresholdToNotify <= 1;

          // Determinar cores e título baseado no threshold
          let warningTitle: string;
          let warningColor: string;
          let borderColor: string;

          if (thresholdToNotify === 1) {
            warningTitle = '⚠️ Assinatura Expira Amanhã!';
            warningColor = '#fee2e2';
            borderColor = '#ef4444';
          } else if (thresholdToNotify === 3) {
            warningTitle = '⚠️ Assinatura Expira em 3 Dias';
            warningColor = '#fff7ed';
            borderColor = '#f59e0b';
          } else {
            warningTitle = 'ℹ️ Assinatura Expira em 7 Dias';
            warningColor = '#fef3c7';
            borderColor = '#fbbf24';
          }

          const userName = church.name || userEmail.split('@')[0] || 'Usuário';

          await sendEmail({
            to: userEmail,
            subject: isUrgent
              ? 'URGENTE: Sua Assinatura Expira Amanhã - Flock'
              : `Aviso: Assinatura Expira em ${thresholdToNotify} Dias - Flock`,
            html: getSubscriptionExpiringWarningTemplate({
              userName,
              planName,
              expirationDate: expirationDateFormatted,
              daysRemaining: daysRemainingFormatted,
              warningTitle,
              warningColor,
              borderColor,
              isUrgent,
            }),
          });

          // Atualizar cache
          const cacheKey = `${church.id}:${thresholdToNotify}`;
          expirationWarningCache.set(cacheKey, nowTimestamp);
          emailsSent++;

          console.log(`✅ Aviso de expiração enviado para ${userEmail} (${thresholdToNotify} dias antes)`);
        } catch (emailError) {
          console.error(`Erro ao enviar aviso de expiração para ${userEmail}:`, emailError);
        }
      }
    }

    if (emailsSent > 0) {
      console.log(`✅ ${emailsSent} aviso(s) de expiração enviado(s)`);
    } else {
      console.log('ℹ️ Nenhum aviso de expiração necessário no momento');
    }

    return emailsSent;
  } catch (error) {
    console.error('Erro ao verificar expiração de assinaturas:', error);
    return 0;
  }
}

/**
 * Executa verificação de expiração de assinaturas
 * Pode ser chamado manualmente ou via cron job
 */
export async function runExpirationCheckJob() {
  console.log('🔄 Iniciando verificação de assinaturas próximas do vencimento...');
  const count = await checkSubscriptionExpiration();
  console.log(`✅ Verificação concluída. ${count} aviso(s) enviado(s).`);
  return count;
}

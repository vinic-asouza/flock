import supabase from '../services/supabase';

/**
 * Limpa assinaturas pendentes expiradas (mais de 7 dias)
 * Esta função deve ser executada periodicamente via cron job
 */
export async function cleanupExpiredPendingSubscriptions(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('pending_subscriptions')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) {
      console.error('Erro ao limpar assinaturas pendentes:', error);
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      console.log(`✅ ${count} assinatura(s) pendente(s) expirada(s) removida(s)`);
    } else {
      console.log('ℹ️ Nenhuma assinatura pendente expirada encontrada');
    }

    return count;
  } catch (error) {
    console.error('Erro ao limpar assinaturas pendentes:', error);
    return 0;
  }
}

/**
 * Executa limpeza de assinaturas pendentes expiradas
 * Pode ser chamado manualmente ou via cron job
 */
export async function runCleanupJob() {
  console.log('🔄 Iniciando limpeza de assinaturas pendentes expiradas...');
  const count = await cleanupExpiredPendingSubscriptions();
  console.log(`✅ Limpeza concluída. ${count} registro(s) removido(s).`);
  return count;
}


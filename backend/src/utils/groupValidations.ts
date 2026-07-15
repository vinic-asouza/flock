import { supabaseAdmin as supabase } from '../services/supabase';
import { logError } from './logger';

/**
 * Valida se o responsável pertence à igreja e à congregação do grupo.
 */
export async function validateResponsibleAndCongregation(
  responsibleId: string | null | undefined,
  congregationId: string | null | undefined,
  churchId: string
): Promise<{ isValid: boolean; errorMessage?: string }> {
  if (!responsibleId || responsibleId.trim() === '') {
    return { isValid: true };
  }

  const { data: responsible, error: responsibleError } = await supabase
    .from('members')
    .select('id, name, church_id, congregation_id')
    .eq('id', responsibleId)
    .eq('church_id', churchId)
    .single();

  if (responsibleError || !responsible) {
    logError('Erro ao buscar responsável:', responsibleError);
    return {
      isValid: false,
      errorMessage: 'Responsável não encontrado ou não pertence a esta igreja',
    };
  }

  if (!congregationId || congregationId.trim() === '') {
    return { isValid: true };
  }

  if (responsible.congregation_id === congregationId) {
    return { isValid: true };
  }

  return {
    isValid: false,
    errorMessage: 'O responsável selecionado não está associado à congregação do grupo',
  };
}

/**
 * Valida se a congregação pertence à igreja.
 */
export async function validateGroupCongregation(
  congregationId: string | null | undefined,
  churchId: string
): Promise<{ isValid: boolean; errorMessage?: string }> {
  if (!congregationId || congregationId.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Congregação é obrigatória',
    };
  }

  const { data: congregation, error: congregationError } = await supabase
    .from('congregations')
    .select('id, church_id')
    .eq('id', congregationId)
    .eq('church_id', churchId)
    .single();

  if (congregationError || !congregation) {
    logError('Erro ao buscar congregação:', congregationError);
    return {
      isValid: false,
      errorMessage: 'Congregação não encontrada ou não pertence a esta igreja',
    };
  }

  return { isValid: true };
}

/**
 * Valida se o membro pertence à igreja e à congregação do grupo.
 */
export async function validateMemberForGroup(
  memberId: string,
  groupId: string,
  churchId: string
): Promise<{ isValid: boolean; errorMessage?: string }> {
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, name, church_id, congregation_id')
    .eq('id', memberId)
    .eq('church_id', churchId)
    .single();

  if (memberError || !member) {
    logError('Erro ao buscar membro:', memberError);
    return {
      isValid: false,
      errorMessage: 'Membro não encontrado ou não pertence a esta igreja',
    };
  }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, congregation_id')
    .eq('id', groupId)
    .eq('church_id', churchId)
    .single();

  if (groupError || !group) {
    logError('Erro ao buscar grupo:', groupError);
    return {
      isValid: false,
      errorMessage: 'Grupo não encontrado ou não pertence a esta igreja',
    };
  }

  if (!group.congregation_id || member.congregation_id === group.congregation_id) {
    return { isValid: true };
  }

  return {
    isValid: false,
    errorMessage: 'O membro selecionado não pertence à congregação do grupo',
  };
}

import supabase from '../services/supabase';
import { logError } from './logger';

/**
 * Valida se o responsável pertence à igreja e se está associado à congregação do grupo (se fornecida)
 * 
 * @param responsibleId - ID do responsável a ser validado (pode ser null/undefined)
 * @param congregationId - ID da congregação do grupo (pode ser null/undefined ou string vazia para 'Sede')
 * @param churchId - ID da igreja para validar pertencimento
 * @returns Promise com objeto contendo isValid (boolean) e errorMessage (string opcional)
 */
export async function validateResponsibleAndCongregation(
  responsibleId: string | null | undefined,
  congregationId: string | null | undefined,
  churchId: string
): Promise<{ isValid: boolean; errorMessage?: string }> {
  // Se não há responsável, não precisa validar
  if (!responsibleId || responsibleId.trim() === '') {
    return { isValid: true };
  }

  // Buscar o responsável e verificar se pertence à igreja
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
      errorMessage: 'Responsável não encontrado ou não pertence a esta igreja'
    };
  }

  // Se não há congregação do grupo (ou é 'Sede'), responsável pode ser de qualquer congregação da igreja
  if (!congregationId || congregationId.trim() === '') {
    return { isValid: true };
  }

  // Se há congregação do grupo, verificar se o responsável está associado a ela
  // O responsável pode estar na congregação ou na Sede (congregation_id null)
  if (responsible.congregation_id === congregationId) {
    return { isValid: true };
  }

  // Se o responsável está na Sede (congregation_id null), ele pode ser responsável de qualquer congregação
  if (!responsible.congregation_id) {
    // Verificar se a congregação do grupo pertence à igreja
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
        errorMessage: 'Congregação do grupo não encontrada ou não pertence a esta igreja'
      };
    }

    return { isValid: true };
  }

  // Responsável está em outra congregação, não pode ser responsável deste grupo
  return {
    isValid: false,
    errorMessage: 'O responsável selecionado não está associado à congregação do grupo'
  };
}

/**
 * Valida se a congregação pertence à igreja
 * 
 * @param congregationId - ID da congregação (pode ser null/undefined ou string vazia para 'Sede')
 * @param churchId - ID da igreja para validar pertencimento
 * @returns Promise com objeto contendo isValid (boolean) e errorMessage (string opcional)
 */
export async function validateGroupCongregation(
  congregationId: string | null | undefined,
  churchId: string
): Promise<{ isValid: boolean; errorMessage?: string }> {
  // Se não há congregação (ou é 'Sede'), é válido
  if (!congregationId || congregationId.trim() === '') {
    return { isValid: true };
  }

  // Verificar se a congregação pertence à igreja
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
      errorMessage: 'Congregação não encontrada ou não pertence a esta igreja'
    };
  }

  return { isValid: true };
}

/**
 * Valida se o membro pertence à igreja e à congregação do grupo (se o grupo tiver congregação)
 * 
 * @param memberId - ID do membro a ser validado
 * @param groupId - ID do grupo
 * @param churchId - ID da igreja para validar pertencimento
 * @returns Promise com objeto contendo isValid (boolean) e errorMessage (string opcional)
 */
export async function validateMemberForGroup(
  memberId: string,
  groupId: string,
  churchId: string
): Promise<{ isValid: boolean; errorMessage?: string }> {
  // Buscar o membro e verificar se pertence à igreja
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
      errorMessage: 'Membro não encontrado ou não pertence a esta igreja'
    };
  }

  // Buscar o grupo para verificar sua congregação
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
      errorMessage: 'Grupo não encontrado ou não pertence a esta igreja'
    };
  }

  // Se o grupo não tem congregação (Sede), qualquer membro da igreja pode ser adicionado
  if (!group.congregation_id) {
    return { isValid: true };
  }

  // Se o grupo tem congregação, o membro deve estar na mesma congregação ou na Sede (null)
  if (member.congregation_id === group.congregation_id) {
    return { isValid: true };
  }

  // Se o membro está na Sede (null), ele pode ser adicionado a qualquer grupo
  if (!member.congregation_id) {
    return { isValid: true };
  }

  // Membro está em outra congregação, não pode ser adicionado a este grupo
  return {
    isValid: false,
    errorMessage: 'O membro selecionado não pertence à congregação do grupo'
  };
}

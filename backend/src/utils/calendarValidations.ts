import { supabaseAdmin as supabase } from '../services/supabase';
import { logError } from './logger';

/**
 * Valida se a congregação pertence à igreja
 * 
 * @param congregationId - ID da congregação (vazio = escopo da igreja toda)
 * @param churchId - ID da igreja para validar pertencimento
 * @returns Promise com objeto contendo isValid (boolean) e errorMessage (string opcional)
 */
export async function validateCongregation(
  congregationId: string | null | undefined,
  churchId: string
): Promise<{ isValid: boolean; errorMessage?: string }> {
  // Sem congregação = escopo da igreja toda
  if (!congregationId || congregationId.trim() === '') {
    return { isValid: true };
  }

  // Buscar a congregação e verificar se pertence à igreja
  const { data: congregation, error: congregationError } = await supabase
    .from('congregations')
    .select('id, name, church_id')
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
 * Valida se o grupo pertence à igreja e se está associado à congregação (se fornecida)
 * 
 * @param groupId - ID do grupo a ser validado (pode ser null/undefined)
 * @param congregationId - ID da congregação do item (vazio = escopo da igreja toda)
 * @param churchId - ID da igreja para validar pertencimento
 * @returns Promise com objeto contendo isValid (boolean) e errorMessage (string opcional)
 */
export async function validateGroup(
  groupId: string | null | undefined,
  congregationId: string | null | undefined,
  churchId: string
): Promise<{ isValid: boolean; errorMessage?: string }> {
  // Se não há grupo, não precisa validar
  if (!groupId || groupId.trim() === '') {
    return { isValid: true };
  }

  // Buscar o grupo e verificar se pertence à igreja
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, church_id, congregation_id')
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

  // Sem congregação no item = qualquer grupo da igreja
  if (!congregationId || congregationId.trim() === '') {
    return { isValid: true };
  }

  if (group.congregation_id === congregationId) {
    return { isValid: true };
  }

  return {
    isValid: false,
    errorMessage: 'O grupo não pertence à congregação selecionada'
  };
}

/**
 * Valida se o responsável pertence à igreja e se está associado à congregação (se fornecida)
 * 
 * @param responsibleId - ID do responsável a ser validado (pode ser null/undefined)
 * @param congregationId - ID da congregação do item (vazio = escopo da igreja toda)
 * @param churchId - ID da igreja para validar pertencimento
 * @returns Promise com objeto contendo isValid (boolean) e errorMessage (string opcional)
 */
export async function validateResponsibleMember(
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

  // Sem congregação no item = responsável de qualquer congregação
  if (!congregationId || congregationId.trim() === '') {
    return { isValid: true };
  }

  if (responsible.congregation_id === congregationId) {
    return { isValid: true };
  }

  return {
    isValid: false,
    errorMessage: 'O responsável não pertence à congregação selecionada'
  };
}

/**
 * Valida se os membros participantes pertencem à igreja e à congregação do item (se fornecida)
 * 
 * @param memberIds - Array de IDs dos membros a serem validados
 * @param congregationId - ID da congregação do item (vazio = escopo da igreja toda)
 * @param churchId - ID da igreja para validar pertencimento
 * @returns Promise com objeto contendo isValid (boolean) e errorMessage (string opcional)
 */
export async function validateParticipants(
  memberIds: string[],
  congregationId: string | null | undefined,
  churchId: string
): Promise<{ isValid: boolean; errorMessage?: string }> {
  // Se não há membros, não precisa validar
  if (!memberIds || memberIds.length === 0) {
    return { isValid: true };
  }

  // Buscar os membros e verificar se pertencem à igreja
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, name, church_id, congregation_id')
    .in('id', memberIds)
    .eq('church_id', churchId);

  if (membersError) {
    logError('Erro ao buscar membros participantes:', membersError);
    return {
      isValid: false,
      errorMessage: 'Erro ao validar membros participantes'
    };
  }

  // Verificar se todos os membros foram encontrados
  if (!members || members.length !== memberIds.length) {
    return {
      isValid: false,
      errorMessage: 'Um ou mais membros não pertencem à sua igreja'
    };
  }

  // Sem congregação no item = membros de qualquer congregação
  if (!congregationId || congregationId.trim() === '') {
    return { isValid: true };
  }

  const invalidMembers = members.filter(
    member => member.congregation_id !== congregationId
  );

  if (invalidMembers.length > 0) {
    return {
      isValid: false,
      errorMessage: 'Um ou mais membros não pertencem à congregação selecionada'
    };
  }

  return { isValid: true };
}

import { supabaseAdmin as supabase } from '../services/supabase';
import { logError } from './logger';

/**
 * Valida se um email já está em uso por outro membro
 * 
 * @param email - Email a ser validado (pode ser vazio/null, campo é opcional)
 * @param churchId - ID da igreja para filtrar membros
 * @param excludeMemberId - ID do membro a ser excluído da verificação (opcional, usado em updates)
 * @returns Promise com objeto contendo isValid (boolean), errorMessage (string opcional) e duplicateMemberName (string opcional)
 * 
 * @example
 * ```typescript
 * const validation = await validateEmailUniqueness('email@exemplo.com', churchId);
 * if (!validation.isValid) {
 *   // Email já está em uso
 * }
 * ```
 */
export async function validateEmailUniqueness(
  email: string,
  churchId: string,
  excludeMemberId?: string
): Promise<{ isValid: boolean; errorMessage?: string; duplicateMemberName?: string }> {
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return { isValid: true }; // Email vazio é válido (campo opcional)
  }

  const trimmedEmail = email.trim().toLowerCase();

  let query = supabase
    .from('members')
    .select('id, name, email')
    .eq('church_id', churchId)
    .ilike('email', trimmedEmail)
    .limit(1);

  if (excludeMemberId) {
    query = query.neq('id', excludeMemberId);
  }

  const { data: emailDuplicate, error: emailCheckError } = await query;

  if (emailCheckError) {
    logError('Erro ao verificar email duplicado:', emailCheckError);
    return { isValid: true }; // Em caso de erro, permitir (não bloquear)
  }

  if (emailDuplicate && emailDuplicate.length > 0) {
    return {
      isValid: false,
      errorMessage: 'Email já cadastrado',
      duplicateMemberName: emailDuplicate[0].name
    };
  }

  return { isValid: true };
}

/**
 * Valida se os grupos existem e pertencem à igreja ou suas congregações
 * 
 * Verifica:
 * - Se todos os grupos existem no banco de dados
 * - Se cada grupo pertence à igreja diretamente ou a uma de suas congregações
 * 
 * @param groupIds - Array de IDs dos grupos a serem validados (pode ser vazio)
 * @param churchId - ID da igreja para validar pertencimento
 * @returns Promise com objeto contendo isValid (boolean) e errorMessage (string opcional)
 * 
 * @example
 * ```typescript
 * const validation = await validateGroups(['group-id-1', 'group-id-2'], churchId);
 * if (!validation.isValid) {
 *   // Algum grupo é inválido
 * }
 * ```
 */
export async function validateGroups(
  groupIds: string[],
  churchId: string
): Promise<{ isValid: boolean; errorMessage?: string }> {
  if (!groupIds || groupIds.length === 0) {
    return { isValid: true }; // Sem grupos é válido
  }

  // Buscar todas as congregações da igreja
  const { data: congregations, error: congregationsError } = await supabase
    .from('congregations')
    .select('id')
    .eq('church_id', churchId);

  if (congregationsError) {
    logError('Erro ao buscar congregações:', congregationsError);
    return {
      isValid: false,
      errorMessage: congregationsError.message
    };
  }

  const congregationIds = congregations ? congregations.map(c => c.id) : [];

  // Buscar os grupos
  const { data: existingGroups, error: groupsCheckError } = await supabase
    .from('groups')
    .select('id, church_id, congregation_id')
    .in('id', groupIds);

  if (groupsCheckError) {
    logError('Erro ao verificar grupos:', groupsCheckError);
    return {
      isValid: false,
      errorMessage: groupsCheckError.message
    };
  }

  // Validar que todos os grupos pertencem à igreja ou às suas congregações
  if (!existingGroups || existingGroups.length !== groupIds.length) {
    return {
      isValid: false,
      errorMessage: 'Um ou mais grupos não existem'
    };
  }

  // Verificar se cada grupo pertence à igreja ou a uma de suas congregações
  for (const group of existingGroups) {
    const belongsToChurch = group.church_id === churchId;
    const belongsToCongregation = group.congregation_id && congregationIds.includes(group.congregation_id);

    if (!belongsToChurch && !belongsToCongregation) {
      return {
        isValid: false,
        errorMessage: 'Um ou mais grupos não pertencem a esta igreja'
      };
    }
  }

  return { isValid: true };
}

import { supabaseAdmin as supabase } from '../services/supabase';
import { logError } from './logger';

/**
 * Valida se o mentor pertence à igreja e se está associado à congregação (se fornecida)
 * 
 * @param mentorId - ID do mentor a ser validado (pode ser null/undefined)
 * @param expectedCongregationId - ID da congregação prevista (vazio = ainda não definida)
 * @param churchId - ID da igreja para validar pertencimento
 * @returns Promise com objeto contendo isValid (boolean) e errorMessage (string opcional)
 */
export async function validateMentorAndCongregation(
  mentorId: string | null | undefined,
  expectedCongregationId: string | null | undefined,
  churchId: string
): Promise<{ isValid: boolean; errorMessage?: string }> {
  // Se não há mentor, não precisa validar
  if (!mentorId || mentorId.trim() === '') {
    return { isValid: true };
  }

  // Buscar o mentor e verificar se pertence à igreja
  const { data: mentor, error: mentorError } = await supabase
    .from('members')
    .select('id, name, church_id, congregation_id')
    .eq('id', mentorId)
    .eq('church_id', churchId)
    .single();

  if (mentorError || !mentor) {
    logError('Erro ao buscar mentor:', mentorError);
    return {
      isValid: false,
      errorMessage: 'Mentor não encontrado ou não pertence a esta igreja'
    };
  }

  // Sem congregação prevista (= ainda não definida), mentor pode ser de qualquer congregação
  if (!expectedCongregationId || expectedCongregationId.trim() === '') {
    return { isValid: true };
  }

  if (mentor.congregation_id === expectedCongregationId) {
    return { isValid: true };
  }

  return {
    isValid: false,
    errorMessage: 'O mentor selecionado não está associado à congregação prevista'
  };
}

/**
 * Valida se a congregação prevista pertence à igreja
 * 
 * @param expectedCongregationId - ID da congregação prevista (vazio = ainda não definida)
 * @param churchId - ID da igreja para validar pertencimento
 * @returns Promise com objeto contendo isValid (boolean) e errorMessage (string opcional)
 */
export async function validateCongregation(
  expectedCongregationId: string | null | undefined,
  churchId: string
): Promise<{ isValid: boolean; errorMessage?: string }> {
  // Sem congregação prevista (= ainda não definida) é válido
  if (!expectedCongregationId || expectedCongregationId.trim() === '') {
    return { isValid: true };
  }

  // Verificar se a congregação pertence à igreja
  const { data: congregation, error: congregationError } = await supabase
    .from('congregations')
    .select('id, church_id')
    .eq('id', expectedCongregationId)
    .eq('church_id', churchId)
    .single();

  if (congregationError || !congregation) {
    logError('Erro ao buscar congregação:', congregationError);
    return {
      isValid: false,
      errorMessage: 'Congregação prevista não encontrada ou não pertence a esta igreja'
    };
  }

  return { isValid: true };
}

/**
 * Valida se já existe um integrante com o mesmo nome na igreja
 * 
 * @param name - Nome do integrante a ser validado
 * @param churchId - ID da igreja para filtrar integrantes
 * @param excludeIntegrationMemberId - ID do integrante a ser excluído da verificação (opcional, usado em updates)
 * @returns Promise com objeto contendo isValid (boolean) e errorMessage (string opcional)
 */
export async function validateIntegrationMemberNameUniqueness(
  name: string,
  churchId: string,
  excludeIntegrationMemberId?: string
): Promise<{ isValid: boolean; errorMessage?: string }> {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { isValid: true }; // Nome vazio será validado pelo schema
  }

  const normalizedName = name.trim().toLowerCase();

  let query = supabase
    .from('integration_members')
    .select('id, name')
    .eq('church_id', churchId)
    .ilike('name', normalizedName)
    .limit(1);

  if (excludeIntegrationMemberId) {
    query = query.neq('id', excludeIntegrationMemberId);
  }

  const { data: duplicate, error: checkError } = await query;

  if (checkError) {
    logError('Erro ao verificar duplicidade de nome:', checkError);
    return { isValid: true }; // Em caso de erro, permitir (não bloquear)
  }

  if (duplicate && duplicate.length > 0) {
    return {
      isValid: false,
      errorMessage: 'Já existe um integrante cadastrado com este nome completo'
    };
  }

  return { isValid: true };
}

/**
 * Valida todos os dados de um integrante antes de criar ou atualizar
 * 
 * @param value - Dados do integrante a serem validados
 * @param churchId - ID da igreja
 * @param excludeIntegrationMemberId - ID do integrante a ser excluído da verificação de duplicidade (opcional, usado em updates)
 * @returns Promise com objeto contendo isValid (boolean), errorMessage (string opcional) e field (string opcional)
 */
export async function validateIntegrationMemberData(
  value: Partial<{ name: string; expected_congregation_id?: string | null; mentor_id?: string | null }>,
  churchId: string,
  excludeIntegrationMemberId?: string
): Promise<{ isValid: boolean; errorMessage?: string; field?: string }> {
  // Validar congregação prevista
  const congregationValidation = await validateCongregation(value.expected_congregation_id, churchId);
  if (!congregationValidation.isValid) {
    return {
      isValid: false,
      errorMessage: congregationValidation.errorMessage || 'A congregação prevista não é válida',
      field: 'expected_congregation_id'
    };
  }

  // Validar mentor e sua associação com a congregação
  const mentorValidation = await validateMentorAndCongregation(
    value.mentor_id,
    value.expected_congregation_id,
    churchId
  );
  if (!mentorValidation.isValid) {
    return {
      isValid: false,
      errorMessage: mentorValidation.errorMessage || 'O mentor selecionado não é válido',
      field: 'mentor_id'
    };
  }

  // Verificar duplicidade de nome
  if (value.name && typeof value.name === 'string' && value.name.trim()) {
    const nameValidation = await validateIntegrationMemberNameUniqueness(
      value.name,
      churchId,
      excludeIntegrationMemberId
    );
    if (!nameValidation.isValid) {
      return {
        isValid: false,
        errorMessage: nameValidation.errorMessage || 'Já existe um integrante com este nome',
        field: 'name'
      };
    }
  }

  return { isValid: true };
}

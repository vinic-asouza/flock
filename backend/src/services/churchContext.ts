import supabase from './supabase';
import { ChurchContext, ChurchUserRole } from '../types';

/**
 * Retorna o contexto (church_id + role) do usuário.
 * 1) Tenta church_users (status = active)
 * 2) Fallback: churches.user_id como owner (compatibilidade pós-migração)
 */
export async function getChurchContextForUser(userId: string): Promise<ChurchContext | null> {
  const { data: membership, error: membershipError } = await supabase
    .from('church_users')
    .select('church_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!membershipError && membership) {
    return {
      churchId: membership.church_id,
      role: membership.role as ChurchUserRole
    };
  }

  const { data: church, error: churchError } = await supabase
    .from('churches')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!churchError && church) {
    return {
      churchId: church.id,
      role: 'owner'
    };
  }

  return null;
}

const ROLE_ORDER: ChurchUserRole[] = ['reader', 'editor', 'admin', 'owner'];

/**
 * Verifica se o papel atual atende ao mínimo exigido (owner > admin > editor > reader).
 */
export function hasRoleOrHigher(current: ChurchUserRole, required: ChurchUserRole): boolean {
  const currIdx = ROLE_ORDER.indexOf(current);
  const reqIdx = ROLE_ORDER.indexOf(required);
  return currIdx >= 0 && reqIdx >= 0 && currIdx >= reqIdx;
}

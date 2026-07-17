import { ChurchContext, ChurchUserRole } from '../types';
import { resolveCongregationFilter } from './primaryCongregation';
import { supabaseAdmin as supabase } from '../services/supabase';
import { logError } from './logger';

export type CongregationScopeInput = {
  accessAllCongregations?: boolean;
  congregationIds?: string[];
};

export type ParsedCongregationScope =
  | { ok: true; accessAllCongregations: true; congregationIds: [] }
  | { ok: true; accessAllCongregations: false; congregationIds: string[] }
  | { ok: false; message: string };

/**
 * Owner/admin sempre têm acesso total (dinâmico).
 */
export function roleHasFullCongregationAccess(role: ChurchUserRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function userHasCongregationAccess(
  ctx: ChurchContext,
  congregationId: string | null | undefined
): boolean {
  // Recursos church-wide (sem congregação) são visíveis a reader+ do tenant.
  if (congregationId == null || congregationId === '') {
    return true;
  }
  if (ctx.accessAllCongregations || roleHasFullCongregationAccess(ctx.role)) {
    return true;
  }
  return ctx.congregationIds.includes(congregationId);
}

export function assertCongregationAccess(
  ctx: ChurchContext,
  congregationId: string | null | undefined
): { ok: true } | { ok: false; status: number; body: Record<string, unknown> } {
  if (userHasCongregationAccess(ctx, congregationId)) {
    return { ok: true };
  }
  return {
    ok: false,
    status: 403,
    body: {
      error: 'Sem acesso a esta congregação',
      details: 'Seu usuário não tem permissão para acessar dados desta congregação',
    },
  };
}

/**
 * Editor com escopo restrito não pode criar novas congregações.
 */
export function canCreateCongregation(ctx: ChurchContext): boolean {
  if (roleHasFullCongregationAccess(ctx.role)) return true;
  return ctx.accessAllCongregations;
}

export type ScopedCongregationFilter =
  | { ok: true; mode: 'all' }
  | { ok: true; mode: 'single'; congregationId: string }
  | { ok: true; mode: 'in'; congregationIds: string[]; includeNull: boolean }
  | { ok: false; status: number; message: string };

/**
 * Intersecta filtro do client com o escopo do usuário.
 */
export function resolveScopedCongregationFilter(
  ctx: ChurchContext,
  clientFilter: string | null | undefined,
  options?: { includeNullAsChurchWide?: boolean }
): ScopedCongregationFilter {
  const base = resolveCongregationFilter(clientFilter);
  if (!base.ok) {
    return { ok: false, status: 400, message: base.message };
  }

  const includeNull = Boolean(options?.includeNullAsChurchWide);

  if (ctx.accessAllCongregations || roleHasFullCongregationAccess(ctx.role)) {
    if (base.congregationId) {
      return { ok: true, mode: 'single', congregationId: base.congregationId };
    }
    return { ok: true, mode: 'all' };
  }

  if (!ctx.congregationIds.length) {
    return {
      ok: false,
      status: 403,
      message: 'Sem acesso a congregações. Peça a um administrador para configurar seu escopo.',
    };
  }

  if (base.congregationId) {
    if (!ctx.congregationIds.includes(base.congregationId)) {
      return { ok: false, status: 403, message: 'Sem acesso a esta congregação' };
    }
    return { ok: true, mode: 'single', congregationId: base.congregationId };
  }

  return {
    ok: true,
    mode: 'in',
    congregationIds: ctx.congregationIds,
    includeNull,
  };
}

/**
 * Aplica o filtro resolvido a uma query Supabase (PostgREST).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyScopedCongregationFilter(query: any, column: string, resolved: Exclude<ScopedCongregationFilter, { ok: false }>) {
  if (resolved.mode === 'all') {
    return query;
  }
  if (resolved.mode === 'single') {
    return query.eq(column, resolved.congregationId);
  }
  if (resolved.includeNull) {
    const ids = resolved.congregationIds.join(',');
    return query.or(`${column}.in.(${ids}),${column}.is.null`);
  }
  return query.in(column, resolved.congregationIds);
}

/**
 * Valida body de create/update de church_user para escopo.
 * Admin/owner → always all. Reader/editor → all XOR ≥1 IDs.
 */
export function parseCongregationScopeForRole(
  role: ChurchUserRole,
  input: CongregationScopeInput
): ParsedCongregationScope {
  if (roleHasFullCongregationAccess(role)) {
    return { ok: true, accessAllCongregations: true, congregationIds: [] };
  }

  const accessAll = Boolean(input.accessAllCongregations);
  const rawIds = Array.isArray(input.congregationIds) ? input.congregationIds : [];
  const congregationIds = [...new Set(rawIds.map((id) => String(id).trim()).filter(Boolean))];

  if (accessAll) {
    return { ok: true, accessAllCongregations: true, congregationIds: [] };
  }

  if (congregationIds.length === 0) {
    return {
      ok: false,
      message: 'Selecione ao menos uma congregação ou marque acesso a todas',
    };
  }

  return { ok: true, accessAllCongregations: false, congregationIds };
}

/**
 * Garante que os IDs pertencem à igreja.
 */
export async function validateCongregationIdsBelongToChurch(
  churchId: string,
  congregationIds: string[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (congregationIds.length === 0) {
    return { ok: true };
  }

  const { data, error } = await supabase
    .from('congregations')
    .select('id')
    .eq('church_id', churchId)
    .in('id', congregationIds);

  if (error) {
    logError('Erro ao validar congregações do escopo:', error);
    return { ok: false, message: 'Não foi possível validar as congregações selecionadas' };
  }

  const found = new Set((data || []).map((row: { id: string }) => row.id));
  const missing = congregationIds.filter((id) => !found.has(id));
  if (missing.length > 0) {
    return {
      ok: false,
      message: 'Uma ou mais congregações selecionadas não pertencem a esta igreja',
    };
  }

  return { ok: true };
}

/**
 * Persiste flag + linhas N:N do escopo.
 */
export async function syncChurchUserCongregationScope(
  churchUserId: string,
  role: ChurchUserRole,
  accessAllCongregations: boolean,
  congregationIds: string[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const forceAll = roleHasFullCongregationAccess(role) || accessAllCongregations;

  const { error: updateError } = await supabase
    .from('church_users')
    .update({ access_all_congregations: forceAll })
    .eq('id', churchUserId);

  if (updateError) {
    logError('Erro ao atualizar access_all_congregations:', updateError);
    return { ok: false, message: updateError.message };
  }

  const { error: deleteError } = await supabase
    .from('church_user_congregations')
    .delete()
    .eq('church_user_id', churchUserId);

  if (deleteError) {
    logError('Erro ao limpar church_user_congregations:', deleteError);
    return { ok: false, message: deleteError.message };
  }

  if (!forceAll && congregationIds.length > 0) {
    const { error: insertError } = await supabase.from('church_user_congregations').insert(
      congregationIds.map((congregation_id) => ({
        church_user_id: churchUserId,
        congregation_id,
      }))
    );

    if (insertError) {
      logError('Erro ao inserir church_user_congregations:', insertError);
      return { ok: false, message: insertError.message };
    }
  }

  return { ok: true };
}

/**
 * Carrega escopo a partir do vínculo church_users.
 */
export async function loadCongregationScopeForUser(
  userId: string,
  churchId: string,
  role: ChurchUserRole
): Promise<Pick<ChurchContext, 'accessAllCongregations' | 'congregationIds'>> {
  if (roleHasFullCongregationAccess(role)) {
    return { accessAllCongregations: true, congregationIds: [] };
  }

  const { data: row, error } = await supabase
    .from('church_users')
    .select('id, access_all_congregations')
    .eq('user_id', userId)
    .eq('church_id', churchId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    logError('Erro ao carregar escopo de congregação:', error);
    return { accessAllCongregations: false, congregationIds: [] };
  }

  if (!row) {
    // Sem vínculo ativo: sem acesso (owner legado já cai no branch full acima).
    return { accessAllCongregations: false, congregationIds: [] };
  }

  if (row.access_all_congregations) {
    return { accessAllCongregations: true, congregationIds: [] };
  }

  const { data: links, error: linksError } = await supabase
    .from('church_user_congregations')
    .select('congregation_id')
    .eq('church_user_id', row.id);

  if (linksError) {
    logError('Erro ao listar congregações do usuário:', linksError);
    return { accessAllCongregations: false, congregationIds: [] };
  }

  return {
    accessAllCongregations: false,
    congregationIds: (links || []).map((l: { congregation_id: string }) => l.congregation_id),
  };
}

/**
 * Bloqueia delete se a congregação for a única do escopo de algum reader/editor.
 */
export async function congregationIsSoleScopeForAnyUser(
  congregationId: string
): Promise<{ blocked: false } | { blocked: true; message: string }> {
  const { data: links, error } = await supabase
    .from('church_user_congregations')
    .select('church_user_id, church_users!inner(id, role, access_all_congregations, status)')
    .eq('congregation_id', congregationId);

  if (error) {
    logError('Erro ao verificar escopo único da congregação:', error);
    return { blocked: false };
  }

  for (const link of links || []) {
    const churchUser = link.church_users as unknown as {
      id: string;
      role: ChurchUserRole;
      access_all_congregations: boolean;
      status: string;
    } | null;

    if (!churchUser || churchUser.status !== 'active') continue;
    if (roleHasFullCongregationAccess(churchUser.role) || churchUser.access_all_congregations) {
      continue;
    }

    const { count, error: countError } = await supabase
      .from('church_user_congregations')
      .select('id', { count: 'exact', head: true })
      .eq('church_user_id', churchUser.id);

    if (countError) {
      logError('Erro ao contar escopo do usuário:', countError);
      continue;
    }

    if ((count ?? 0) <= 1) {
      return {
        blocked: true,
        message:
          'Não é possível excluir esta congregação: ela é a única do escopo de um ou mais usuários. Ajuste o acesso desses usuários antes.',
      };
    }
  }

  return { blocked: false };
}

import { Request, Response } from 'express';
import supabase, { supabaseAdmin } from './supabase';
import { AuthRequest, ChurchContext, ChurchUserRole } from '../types';
import { cookieConfig, setActiveChurchId } from '../utils/cookieUtils';
import { loadCongregationScopeForUser } from '../utils/congregationScope';

export interface ChurchMembership {
  churchId: string;
  role: ChurchUserRole;
  churchName: string;
}

const ROLE_ORDER: ChurchUserRole[] = ['reader', 'editor', 'admin', 'owner'];

export function hasRoleOrHigher(current: ChurchUserRole, required: ChurchUserRole): boolean {
  const currIdx = ROLE_ORDER.indexOf(current);
  const reqIdx = ROLE_ORDER.indexOf(required);
  return currIdx >= 0 && reqIdx >= 0 && currIdx >= reqIdx;
}

function pickHighestRole(memberships: ChurchMembership[]): ChurchMembership {
  return memberships.reduce((best, current) =>
    hasRoleOrHigher(current.role, best.role) ? current : best
  );
}

/**
 * Lista todas as igrejas ativas do usuário (church_users + owner legado).
 */
export async function listChurchMembershipsForUser(userId: string): Promise<ChurchMembership[]> {
  const memberships: ChurchMembership[] = [];
  const seen = new Set<string>();

  const { data: rows, error } = await supabaseAdmin
    .from('church_users')
    .select('church_id, role, churches(name)')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (!error && rows) {
    for (const row of rows) {
      const church = row.churches as { name?: string } | null;
      if (!seen.has(row.church_id)) {
        seen.add(row.church_id);
        memberships.push({
          churchId: row.church_id,
          role: row.role as ChurchUserRole,
          churchName: church?.name || 'Igreja',
        });
      }
    }
  }

  const { data: ownedChurches, error: ownedError } = await supabaseAdmin
    .from('churches')
    .select('id, name')
    .eq('user_id', userId);

  if (!ownedError && ownedChurches) {
    for (const church of ownedChurches) {
      if (!seen.has(church.id)) {
        seen.add(church.id);
        memberships.push({
          churchId: church.id,
          role: 'owner',
          churchName: church.name,
        });
      }
    }
  }

  return memberships;
}

async function buildChurchContext(
  userId: string,
  churchId: string,
  role: ChurchUserRole
): Promise<ChurchContext> {
  const scope = await loadCongregationScopeForUser(userId, churchId, role);
  return {
    churchId,
    role,
    accessAllCongregations: scope.accessAllCongregations,
    congregationIds: scope.congregationIds,
  };
}

/**
 * Resolve contexto para igreja ativa (valida membership + escopo de congregação).
 */
export async function resolveChurchContextForUser(
  userId: string,
  activeChurchId?: string | null
): Promise<ChurchContext | null> {
  const memberships = await listChurchMembershipsForUser(userId);
  if (memberships.length === 0) {
    return null;
  }

  if (activeChurchId) {
    const match = memberships.find((m) => m.churchId === activeChurchId);
    if (match) {
      return buildChurchContext(userId, match.churchId, match.role);
    }
    return null;
  }

  if (memberships.length === 1) {
    return buildChurchContext(userId, memberships[0].churchId, memberships[0].role);
  }

  return null;
}

/**
 * Compat: primeira membership ou ativa — use resolveChurchContextForUser quando possível.
 */
export async function getChurchContextForUser(userId: string): Promise<ChurchContext | null> {
  const memberships = await listChurchMembershipsForUser(userId);
  if (memberships.length === 0) {
    return null;
  }
  const picked = pickHighestRole(memberships);
  return buildChurchContext(userId, picked.churchId, picked.role);
}

export function getActiveChurchIdFromRequest(req: Request): string | undefined {
  const header = req.headers['x-church-id'];
  if (typeof header === 'string' && header.trim()) {
    return header.trim();
  }
  const cookie = req.cookies?.[cookieConfig.names.activeChurchId];
  if (typeof cookie === 'string' && cookie.trim()) {
    return cookie.trim();
  }
  return undefined;
}

export type AttachChurchContextResult =
  | { ok: true; context: ChurchContext; memberships: ChurchMembership[] }
  | { ok: false; reason: 'no_membership' }
  | {
      ok: false;
      reason: 'selection_required';
      memberships: ChurchMembership[];
    };

/**
 * Anexa req.church com base em header/cookie/membership única.
 */
export async function attachChurchContext(
  req: AuthRequest,
  res: Response
): Promise<AttachChurchContextResult> {
  if (!req.user) {
    return { ok: false, reason: 'no_membership' };
  }

  const memberships = await listChurchMembershipsForUser(req.user.id);
  if (memberships.length === 0) {
    return { ok: false, reason: 'no_membership' };
  }

  let activeId = getActiveChurchIdFromRequest(req);

  if (!activeId && memberships.length === 1) {
    activeId = memberships[0].churchId;
    setActiveChurchId(res, activeId);
  }

  const context = await resolveChurchContextForUser(req.user.id, activeId);

  if (!context) {
    if (memberships.length > 1) {
      return { ok: false, reason: 'selection_required', memberships };
    }
    return { ok: false, reason: 'no_membership' };
  }

  req.church = context;
  return { ok: true, context, memberships };
}

/**
 * Garante req.user e req.church para checkout autenticado (cookies + optionalAuth).
 */
export async function ensureUserAndChurchContext(
  req: AuthRequest,
  res: Response
): Promise<{ ok: true } | { ok: false; status: number; body: Record<string, unknown> }> {
  if (!req.user && req.cookies) {
    const accessToken = req.cookies[cookieConfig.names.accessToken];
    const refreshToken = req.cookies[cookieConfig.names.refreshToken];

    if (accessToken) {
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      if (!error && user) {
        req.user = { id: user.id, email: user.email || '' };
      }
    }

    if (!req.user && refreshToken) {
      const { data: authData } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });
      if (authData?.user) {
        req.user = { id: authData.user.id, email: authData.user.email || '' };
      }
    }
  }

  if (!req.user) {
    return { ok: false, status: 401, body: { error: 'Não autenticado' } };
  }

  if (!req.church) {
    const attached = await attachChurchContext(req, res);
    if (!attached.ok) {
      if (attached.reason === 'selection_required') {
        return {
          ok: false,
          status: 403,
          body: {
            error: 'Seleção de igreja obrigatória',
            code: 'CHURCH_SELECTION_REQUIRED',
            memberships: attached.memberships,
          },
        };
      }
      return {
        ok: false,
        status: 403,
        body: {
          error: 'Sem acesso a nenhuma igreja',
          details: 'Sua conta não está vinculada a uma igreja.',
        },
      };
    }
  }

  return { ok: true };
}

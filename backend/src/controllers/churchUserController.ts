import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { AuthRequest } from '../types';
import { ChurchUserRole } from '../types';
import { sendEmail } from '../services/emailService';
import { getChurchUserInvitationTemplate } from '../templates/emailTemplates';
import { logError } from '../utils/logger';
import {
  parseCongregationScopeForRole,
  syncChurchUserCongregationScope,
  validateCongregationIdsBelongToChurch,
} from '../utils/congregationScope';

const ROLE_LABELS: Record<ChurchUserRole, string> = {
  owner: 'Dono',
  admin: 'Administrador',
  editor: 'Editor',
  reader: 'Leitor'
};

type ChurchUserRow = {
  id: string;
  user_id: string;
  role: ChurchUserRole;
  status: string;
  created_at: string;
  updated_at?: string;
  access_all_congregations?: boolean;
};

async function loadScopeMap(
  churchUserIds: string[]
): Promise<Record<string, { accessAllCongregations: boolean; congregationIds: string[] }>> {
  const map: Record<string, { accessAllCongregations: boolean; congregationIds: string[] }> = {};
  for (const id of churchUserIds) {
    map[id] = { accessAllCongregations: false, congregationIds: [] };
  }
  if (churchUserIds.length === 0) return map;

  const { data: links, error } = await supabase
    .from('church_user_congregations')
    .select('church_user_id, congregation_id')
    .in('church_user_id', churchUserIds);

  if (error) {
    logError('Erro ao carregar escopos de usuários:', error);
    return map;
  }

  for (const link of links || []) {
    const entry = map[link.church_user_id];
    if (entry) {
      entry.congregationIds.push(link.congregation_id);
    }
  }

  return map;
}

/**
 * Listar usuários da igreja (admin/owner).
 */
export const listChurchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const churchId = req.church!.churchId;

    const { data: rows, error } = await supabase
      .from('church_users')
      .select('id, user_id, role, status, created_at, updated_at, access_all_congregations')
      .eq('church_id', churchId)
      .order('created_at', { ascending: false });

    if (error) {
      logError('Erro ao listar usuários da igreja:', error);
      return res.status(500).json({
        error: 'Erro ao listar usuários',
        details: error.message
      });
    }

    const typedRows = (rows || []) as ChurchUserRow[];
    const userIds = [...new Set(typedRows.map((r) => r.user_id))];
    const emails: Record<string, string> = {};

    if (userIds.length > 0) {
      for (const uid of userIds) {
        const { data: userData } = await supabase.auth.admin.getUserById(uid);
        if (userData?.user?.email) emails[uid] = userData.user.email;
      }
    }

    const scopeMap = await loadScopeMap(typedRows.map((r) => r.id));

    const list = typedRows.map((r) => {
      const isFullRole = r.role === 'owner' || r.role === 'admin';
      const accessAllCongregations = isFullRole || Boolean(r.access_all_congregations);
      const congregationIds = accessAllCongregations
        ? []
        : (scopeMap[r.id]?.congregationIds ?? []);

      return {
        ...r,
        email: emails[r.user_id] ?? null,
        roleLabel: ROLE_LABELS[r.role as ChurchUserRole],
        accessAllCongregations,
        congregationIds,
      };
    });

    return res.json({ data: list });
  } catch (err) {
    logError('Erro em listChurchUsers:', err);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido'
    });
  }
};

/**
 * Adicionar usuário à igreja (admin/owner): email + role + escopo de congregação.
 * Cria usuário no Supabase se não existir; não permite se já estiver em outra igreja.
 */
export const createChurchUser = async (req: AuthRequest, res: Response) => {
  try {
    const churchId = req.church!.churchId;
    const requesterRole = req.church!.role;
    const { email, role, accessAllCongregations, congregationIds } = req.body as {
      email?: string;
      role?: ChurchUserRole;
      accessAllCongregations?: boolean;
      congregationIds?: string[];
    };

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail) {
      return res.status(400).json({
        error: 'Email é obrigatório',
        details: 'Informe o email do usuário'
      });
    }

    const allowedRoles: ChurchUserRole[] = ['admin', 'editor', 'reader'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({
        error: 'Papel inválido',
        details: 'Use: admin, editor ou reader'
      });
    }

    if (requesterRole !== 'owner' && requesterRole !== 'admin') {
      return res.status(403).json({
        error: 'Sem permissão',
        details: 'Apenas administrador ou dono pode adicionar usuários'
      });
    }

    const scope = parseCongregationScopeForRole(role, { accessAllCongregations, congregationIds });
    if (!scope.ok) {
      return res.status(400).json({
        error: 'Escopo de congregação inválido',
        details: scope.message,
      });
    }

    if (!scope.accessAllCongregations) {
      const validation = await validateCongregationIdsBelongToChurch(churchId, scope.congregationIds);
      if (!validation.ok) {
        return res.status(400).json({
          error: 'Escopo de congregação inválido',
          details: validation.message,
        });
      }
    }

    let userId: string;

    let existingUser: { id: string; email?: string } | undefined;
    let page = 1;
    const perPage = 1000;

    while (!existingUser) {
      const { data: existingList, error: listError } = await supabase.auth.admin.listUsers({
        page,
        perPage
      });

      if (listError) {
        logError('Erro ao buscar usuário por email:', listError);
        return res.status(500).json({
          error: 'Erro ao verificar email',
          details: listError.message
        });
      }

      existingUser = (existingList?.users || []).find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      );

      if (!existingList?.users?.length || existingList.users.length < perPage) {
        break;
      }

      page += 1;
    }

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const randomPassword = `Flock${Date.now()}${Math.random().toString(36).slice(2, 10)}!`;
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: randomPassword,
        email_confirm: true
      });

      if (createError) {
        logError('Erro ao criar usuário Supabase:', createError);
        return res.status(400).json({
          error: 'Não foi possível criar o usuário',
          details: createError.message
        });
      }
      if (!createData?.user?.id) {
        return res.status(500).json({
          error: 'Erro ao criar usuário',
          details: 'Resposta inválida do servidor'
        });
      }
      userId = createData.user.id;
    }

    const { data: existingMembership } = await supabase
      .from('church_users')
      .select('id, church_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMembership) {
      if (existingMembership.church_id === churchId) {
        return res.status(400).json({
          error: 'Usuário já faz parte desta igreja',
          details: 'Altere o papel ou status na listagem de usuários'
        });
      }
      return res.status(400).json({
        error: 'Email já em uso em outra igreja',
        details: 'Cada usuário pode pertencer apenas a uma igreja'
      });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('church_users')
      .insert({
        church_id: churchId,
        user_id: userId,
        role,
        status: 'active',
        access_all_congregations: scope.accessAllCongregations,
      })
      .select('id, user_id, role, status, created_at, access_all_congregations')
      .single();

    if (insertError) {
      logError('Erro ao inserir church_user:', insertError);
      return res.status(500).json({
        error: 'Erro ao vincular usuário',
        details: insertError.message
      });
    }

    const sync = await syncChurchUserCongregationScope(
      inserted.id,
      role,
      scope.accessAllCongregations,
      scope.congregationIds
    );
    if (!sync.ok) {
      await supabase.from('church_users').delete().eq('id', inserted.id);
      return res.status(500).json({
        error: 'Erro ao configurar congregações do usuário',
        details: sync.message,
      });
    }

    const { data: churchRow } = await supabase
      .from('churches')
      .select('name')
      .eq('id', churchId)
      .single();
    const churchName = churchRow?.name ?? 'Igreja';
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    try {
      const html = getChurchUserInvitationTemplate({
        churchName,
        roleLabel: ROLE_LABELS[role],
        appUrl
      });

      await sendEmail({
        to: normalizedEmail,
        subject: `Você foi adicionado(a) à igreja ${churchName} no Flock`,
        html
      });
    } catch (emailErr) {
      logError('Erro ao enviar email de convite (não bloqueante):', emailErr);
    }

    return res.status(201).json({
      message: 'Usuário adicionado com sucesso',
      data: {
        ...inserted,
        email: normalizedEmail,
        roleLabel: ROLE_LABELS[role],
        accessAllCongregations: scope.accessAllCongregations,
        congregationIds: scope.congregationIds,
      }
    });
  } catch (err) {
    logError('Erro em createChurchUser:', err);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido'
    });
  }
};

/**
 * Atualizar papel, status e/ou escopo de congregação (admin/owner).
 * Owner não pode ser alterado por esta rota.
 */
export const updateChurchUser = async (req: AuthRequest, res: Response) => {
  try {
    const churchId = req.church!.churchId;
    const { id } = req.params;
    const { role, status, accessAllCongregations, congregationIds } = req.body as {
      role?: ChurchUserRole;
      status?: string;
      accessAllCongregations?: boolean;
      congregationIds?: string[];
    };

    const { data: current } = await supabase
      .from('church_users')
      .select('id, church_id, user_id, role, access_all_congregations')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (!current) {
      return res.status(404).json({
        error: 'Vínculo não encontrado',
        details: 'Usuário não pertence a esta igreja'
      });
    }

    if (current.role === 'owner') {
      return res.status(400).json({
        error: 'Não permitido',
        details: 'O dono da igreja não pode ser alterado por esta rota'
      });
    }

    const updates: {
      role?: ChurchUserRole;
      status?: string;
      access_all_congregations?: boolean;
    } = {};
    const allowedRoles: ChurchUserRole[] = ['admin', 'editor', 'reader'];
    if (role && allowedRoles.includes(role)) updates.role = role;
    if (status && ['active', 'invited', 'disabled'].includes(status)) updates.status = status;

    const nextRole = (updates.role || current.role) as ChurchUserRole;
    const scopeProvided =
      accessAllCongregations !== undefined || congregationIds !== undefined;

    // Rebaixamento admin → reader/editor exige escopo explícito.
    const demotingToScoped =
      (current.role === 'admin') &&
      (nextRole === 'reader' || nextRole === 'editor');

    let parsedScope: ReturnType<typeof parseCongregationScopeForRole> | null = null;

    if (nextRole === 'admin') {
      parsedScope = parseCongregationScopeForRole('admin', {});
    } else if (scopeProvided || demotingToScoped) {
      parsedScope = parseCongregationScopeForRole(nextRole, {
        accessAllCongregations,
        congregationIds,
      });
      if (!parsedScope.ok) {
        return res.status(400).json({
          error: 'Escopo de congregação inválido',
          details: parsedScope.message,
        });
      }
    }

    if (parsedScope?.ok && !parsedScope.accessAllCongregations) {
      const validation = await validateCongregationIdsBelongToChurch(
        churchId,
        parsedScope.congregationIds
      );
      if (!validation.ok) {
        return res.status(400).json({
          error: 'Escopo de congregação inválido',
          details: validation.message,
        });
      }
    }

    if (Object.keys(updates).length === 0 && !parsedScope) {
      return res.status(400).json({
        error: 'Nenhuma alteração válida',
        details: 'Envie role, status e/ou escopo de congregações'
      });
    }

    if (parsedScope?.ok) {
      updates.access_all_congregations = parsedScope.accessAllCongregations;
    }

    let updated: ChurchUserRow = {
      id: current.id,
      user_id: current.user_id,
      role: current.role as ChurchUserRole,
      status: (current as { status?: string }).status || 'active',
      created_at: (current as { created_at?: string }).created_at || '',
      updated_at: (current as { updated_at?: string }).updated_at,
      access_all_congregations: Boolean(current.access_all_congregations),
    };

    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from('church_users')
        .update(updates)
        .eq('id', id)
        .eq('church_id', churchId)
        .select('id, user_id, role, status, created_at, updated_at, access_all_congregations')
        .single();

      if (error) {
        logError('Erro ao atualizar church_user:', error);
        return res.status(500).json({
          error: 'Erro ao atualizar',
          details: error.message
        });
      }
      updated = data as ChurchUserRow;
    }

    if (parsedScope?.ok) {
      const sync = await syncChurchUserCongregationScope(
        id,
        nextRole,
        parsedScope.accessAllCongregations,
        parsedScope.congregationIds
      );
      if (!sync.ok) {
        return res.status(500).json({
          error: 'Erro ao atualizar congregações do usuário',
          details: sync.message,
        });
      }
    }

    const scopeMap = await loadScopeMap([id]);
    const accessAll =
      nextRole === 'admin' ||
      nextRole === 'owner' ||
      Boolean(updated.access_all_congregations) ||
      (parsedScope?.ok ? parsedScope.accessAllCongregations : false);

    return res.json({
      message: 'Usuário atualizado',
      data: {
        ...updated,
        roleLabel: ROLE_LABELS[updated.role as ChurchUserRole],
        accessAllCongregations: accessAll,
        congregationIds: accessAll ? [] : (scopeMap[id]?.congregationIds ?? []),
      }
    });
  } catch (err) {
    logError('Erro em updateChurchUser:', err);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido'
    });
  }
};

/**
 * Desativar (ou remover) vínculo do usuário com a igreja (admin/owner).
 * Não remove o usuário do Supabase; apenas desativa ou remove o registro em church_users.
 */
export const deleteChurchUser = async (req: AuthRequest, res: Response) => {
  try {
    const churchId = req.church!.churchId;
    const { id } = req.params;

    const { data: current } = await supabase
      .from('church_users')
      .select('id, church_id, role')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (!current) {
      return res.status(404).json({
        error: 'Vínculo não encontrado',
        details: 'Usuário não pertence a esta igreja'
      });
    }

    if (current.role === 'owner') {
      return res.status(400).json({
        error: 'Não permitido',
        details: 'O dono da igreja não pode ser removido'
      });
    }

    const { error } = await supabase
      .from('church_users')
      .delete()
      .eq('id', id)
      .eq('church_id', churchId);

    if (error) {
      logError('Erro ao remover church_user:', error);
      return res.status(500).json({
        error: 'Erro ao remover',
        details: error.message
      });
    }

    return res.json({ message: 'Usuário removido da igreja' });
  } catch (err) {
    logError('Erro em deleteChurchUser:', err);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido'
    });
  }
};

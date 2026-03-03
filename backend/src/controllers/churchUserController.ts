import { Response } from 'express';
import supabase from '../services/supabase';
import { supabaseAdmin } from '../services/supabase';
import { AuthRequest } from '../types';
import { ChurchUserRole } from '../types';
import { sendEmail } from '../services/emailService';
import { logError } from '../utils/logger';

const ROLE_LABELS: Record<ChurchUserRole, string> = {
  owner: 'Dono',
  admin: 'Administrador',
  editor: 'Editor',
  reader: 'Leitor'
};

/**
 * Listar usuários da igreja (admin/owner).
 */
export const listChurchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const churchId = req.church!.churchId;

    const { data: rows, error } = await supabase
      .from('church_users')
      .select('id, user_id, role, status, created_at, updated_at')
      .eq('church_id', churchId)
      .order('created_at', { ascending: false });

    if (error) {
      logError('Erro ao listar usuários da igreja:', error);
      return res.status(500).json({
        error: 'Erro ao listar usuários',
        details: error.message
      });
    }

    const userIds = [...new Set((rows || []).map((r: { user_id: string }) => r.user_id))];
    const emails: Record<string, string> = {};

    if (supabaseAdmin && userIds.length > 0) {
      for (const uid of userIds) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (userData?.user?.email) emails[uid] = userData.user.email;
      }
    }

    const list = (rows || []).map((r: { user_id: string; role: string; [k: string]: unknown }) => ({
      ...r,
      email: emails[r.user_id] ?? null,
      roleLabel: ROLE_LABELS[r.role as ChurchUserRole]
    }));

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
 * Adicionar usuário à igreja (admin/owner): email + role.
 * Cria usuário no Supabase se não existir; não permite se já estiver em outra igreja.
 */
export const createChurchUser = async (req: AuthRequest, res: Response) => {
  try {
    const churchId = req.church!.churchId;
    const requesterRole = req.church!.role;
    const { email, role } = req.body as { email?: string; role?: ChurchUserRole };

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

    let userId: string;

    if (!supabaseAdmin) {
      return res.status(503).json({
        error: 'Serviço indisponível',
        details: 'Operação de usuário não configurada'
      });
    }

    const { data: existingList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = (existingList?.users || []).find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const randomPassword = `Flock${Date.now()}${Math.random().toString(36).slice(2, 10)}!`;
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
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
        status: 'active'
      })
      .select('id, user_id, role, status, created_at')
      .single();

    if (insertError) {
      logError('Erro ao inserir church_user:', insertError);
      return res.status(500).json({
        error: 'Erro ao vincular usuário',
        details: insertError.message
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
      await sendEmail({
        to: normalizedEmail,
        subject: `Você foi adicionado(a) à igreja ${churchName} no Flock`,
        html: `
          <p>Olá,</p>
          <p>Você foi adicionado(a) à igreja <strong>${churchName}</strong> no sistema Flock com o papel de <strong>${ROLE_LABELS[role]}</strong>.</p>
          <p>Acesse o sistema em: <a href="${appUrl}/login">${appUrl}/login</a></p>
          <p>Use seu email para entrar. Se ainda não definiu uma senha, use a opção "Esqueci minha senha" na tela de login.</p>
          <p>— Equipe Flock</p>
        `
      });
    } catch (emailErr) {
      logError('Erro ao enviar email de convite (não bloqueante):', emailErr);
    }

    return res.status(201).json({
      message: 'Usuário adicionado com sucesso',
      data: { ...inserted, email: normalizedEmail, roleLabel: ROLE_LABELS[role] }
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
 * Atualizar papel ou status de um usuário da igreja (admin/owner).
 * Owner não pode ser alterado por outro admin (apenas pelo próprio owner ou lógica futura).
 */
export const updateChurchUser = async (req: AuthRequest, res: Response) => {
  try {
    const churchId = req.church!.churchId;
    const { id } = req.params;
    const { role, status } = req.body as { role?: ChurchUserRole; status?: string };

    const { data: current } = await supabase
      .from('church_users')
      .select('id, church_id, user_id, role')
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

    const updates: { role?: ChurchUserRole; status?: string } = {};
    const allowedRoles: ChurchUserRole[] = ['admin', 'editor', 'reader'];
    if (role && allowedRoles.includes(role)) updates.role = role;
    if (status && ['active', 'invited', 'disabled'].includes(status)) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'Nenhuma alteração válida',
        details: 'Envie role e/ou status'
      });
    }

    const { data: updated, error } = await supabase
      .from('church_users')
      .update(updates)
      .eq('id', id)
      .eq('church_id', churchId)
      .select()
      .single();

    if (error) {
      logError('Erro ao atualizar church_user:', error);
      return res.status(500).json({
        error: 'Erro ao atualizar',
        details: error.message
      });
    }

    return res.json({
      message: 'Usuário atualizado',
      data: updated
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

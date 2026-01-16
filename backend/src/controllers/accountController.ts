import { Request, Response } from 'express';
import supabase, { supabaseAdmin } from '../services/supabase';
import { AuthRequest } from '../types';
import { validateEmailChange, validatePasswordChange, validateAccountDeletion } from '../validators/accountValidator';
import { logAudit } from '../utils/auditLogger';
import { sendEmail } from '../services/emailService';
import { getEmailChangeNotificationTemplate, getAccountDeletedTemplate, getPasswordChangedTemplate } from '../templates/emailTemplates';

/**
 * Buscar dados da conta do usuário
 */
export const getAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Buscar dados completos do usuário usando o token do middleware
    const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
    
    let userData: {
      id: string;
      email: string;
      phone: string | null;
      email_confirmed_at: string | null;
      phone_confirmed_at: string | null;
      created_at: string | null;
      last_sign_in_at: string | null;
    } = {
      id: req.user.id,
      email: req.user.email,
      phone: null,
      email_confirmed_at: null,
      phone_confirmed_at: null,
      created_at: null,
      last_sign_in_at: null
    };

    // Tentar buscar dados adicionais se o token estiver disponível
    if (token) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userData = {
            id: user.id,
            email: user.email || '',
            phone: user.phone || null,
            email_confirmed_at: user.email_confirmed_at || null,
            phone_confirmed_at: user.phone_confirmed_at || null,
            created_at: user.created_at || null,
            last_sign_in_at: user.last_sign_in_at || null
          };
        }
      } catch (error) {
        // Se falhar, usar dados básicos do req.user
        console.log('Usando dados básicos do usuário:', error);
      }
    }

    res.json({
      message: 'Dados da conta recuperados com sucesso',
      user: userData
    });

  } catch (error) {
    console.error('Erro ao buscar dados da conta:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Alterar email do usuário
 */
export const changeEmail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { newEmail, password } = req.body;

    // Validar dados da requisição
    const { error: validationError } = validateEmailChange({ newEmail, password });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map((detail: any) => detail.message)
      });
    }

    // Verificar se a senha está correta
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email!,
      password: password
    });

    if (signInError) {
      return res.status(400).json({
        error: 'Senha incorreta',
        details: 'A senha fornecida não está correta'
      });
    }

    // Verificar se o novo email é diferente do atual
    if (newEmail === req.user.email) {
      return res.status(400).json({
        error: 'Email inválido',
        details: 'O novo email deve ser diferente do email atual'
      });
    }

    // Salvar email antigo antes de alterar
    const oldEmail = req.user.email!;

    // Atualizar email com redirecionamento para o callback do frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    // Em supabase-js v2, updateUser aceita um segundo parâmetro com emailRedirectTo
    // Se a versão não suportar, a URL de redirecionamento deve estar configurada no painel do Supabase
    // Authentication → URL Configuration → Redirect URLs
    const { error: updateError } = await (supabase.auth as any).updateUser(
      { email: newEmail },
      { emailRedirectTo: `${frontendUrl}/auth/callback` }
    );

    if (updateError) {
      return res.status(400).json({
        error: 'Erro ao alterar email',
        details: updateError.message
      });
    }

    // Enviar email de notificação para o email antigo (não bloquear o fluxo se der erro)
    try {
      const userName = oldEmail.split('@')[0] || 'Usuário';
      const changeDate = new Date().toLocaleString('pt-BR', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo'
      });
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      await sendEmail({
        to: oldEmail,
        subject: 'Alteração de Email Solicitada - Flock',
        html: getEmailChangeNotificationTemplate({
          userName,
          oldEmail,
          newEmail,
          changeDate,
          ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
        }),
      });
    } catch (emailError) {
      // Logar erro mas não quebrar o fluxo de alteração de email
      console.error('Erro ao enviar email de notificação de alteração de email:', emailError);
    }

    res.json({
      message: 'Email alterado com sucesso',
      details: 'Um email de confirmação foi enviado para o novo endereço. Verifique sua caixa de entrada.'
    });

  } catch (error) {
    console.error('Erro ao alterar email:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Alterar senha do usuário
 */
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Validar dados da requisição
    const { error: validationError } = validatePasswordChange({ currentPassword, newPassword });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map((detail: any) => detail.message)
      });
    }

    // Verificar se a senha atual está correta
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email!,
      password: currentPassword
    });

    if (signInError) {
      return res.status(400).json({
        error: 'Senha atual incorreta',
        details: 'A senha atual fornecida não está correta'
      });
    }

    // Atualizar senha
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return res.status(400).json({
        error: 'Erro ao alterar senha',
        details: updateError.message
      });
    }

    // Enviar email de confirmação (não bloquear o fluxo se der erro)
    try {
      const userName = req.user.email?.split('@')[0] || 'Usuário';
      const changeDate = new Date().toLocaleString('pt-BR', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo'
      });
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      await sendEmail({
        to: req.user.email!,
        subject: 'Senha Alterada - Flock',
        html: getPasswordChangedTemplate({
          userName,
          changeDate,
          ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
        }),
      });
    } catch (emailError) {
      // Logar erro mas não quebrar o fluxo de alteração de senha
      console.error('Erro ao enviar email de confirmação de alteração de senha:', emailError);
    }

    res.json({
      message: 'Senha alterada com sucesso',
      details: 'Sua senha foi atualizada. Use a nova senha para seus próximos logins.'
    });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Alterar telefone do usuário
 */
export const changePhone = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { newPhone, password } = req.body;

    // Validar dados da requisição
    if (!newPhone || !password) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: 'Telefone e senha são obrigatórios'
      });
    }

    // Verificar se a senha está correta
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email!,
      password: password
    });

    if (signInError) {
      return res.status(400).json({
        error: 'Senha incorreta',
        details: 'A senha fornecida não está correta'
      });
    }

    // Atualizar telefone
    const { error: updateError } = await supabase.auth.updateUser({
      phone: newPhone
    });

    if (updateError) {
      return res.status(400).json({
        error: 'Erro ao alterar telefone',
        details: updateError.message
      });
    }

    res.json({
      message: 'Telefone alterado com sucesso',
      details: 'Seu telefone foi atualizado com sucesso.'
    });

  } catch (error) {
    console.error('Erro ao alterar telefone:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Excluir conta do usuário
 */
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { password, confirmation } = req.body;

    // Validar dados da requisição
    const { error: validationError } = validateAccountDeletion({ password, confirmation });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map((detail: any) => detail.message)
      });
    }

    // Verificar se a senha está correta
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email!,
      password: password
    });

    if (signInError) {
      return res.status(400).json({
        error: 'Senha incorreta',
        details: 'A senha fornecida não está correta'
      });
    }

    // Salvar informações do usuário antes de excluir (para enviar email)
    const userEmail = req.user.email!;
    const userName = userEmail.split('@')[0] || 'Usuário';

    // Excluir usuário do Supabase Auth (requer Service Role Key)
    if (!supabaseAdmin) {
      return res.status(500).json({
        error: 'Configuração ausente',
        details: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor. Não é possível excluir a conta.'
      });
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);

    if (deleteError) {
      return res.status(400).json({
        error: 'Erro ao excluir conta',
        details: deleteError.message
      });
    }

    // Enviar email de confirmação de exclusão (não bloquear o fluxo se der erro)
    // IMPORTANTE: Enviar após exclusão bem-sucedida, mas capturar email antes
    try {
      const deletionDate = new Date().toLocaleString('pt-BR', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo'
      });
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      await sendEmail({
        to: userEmail,
        subject: 'Conta Excluída - Flock',
        html: getAccountDeletedTemplate({
          userName,
          userEmail,
          deletionDate,
          ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
        }),
      });
    } catch (emailError) {
      // Logar erro mas não quebrar o fluxo de exclusão
      console.error('Erro ao enviar email de confirmação de exclusão de conta:', emailError);
    }

    res.json({
      message: 'Conta excluída com sucesso',
      details: 'Sua conta e todos os dados associados foram permanentemente removidos.'
    });

  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Reenviar email de confirmação
 */
export const resendConfirmation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email não fornecido',
        details: 'O email é obrigatório para reenvio de confirmação'
      });
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });

    if (error) {
      return res.status(400).json({
        error: 'Erro ao reenviar confirmação',
        details: error.message
      });
    }

    res.json({
      message: 'Email de confirmação reenviado',
      details: 'Verifique sua caixa de entrada para confirmar seu email.'
    });

  } catch (error) {
    console.error('Erro ao reenviar confirmação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Listar logs de auditoria da conta
 */
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Buscar church_id do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Parâmetros de paginação e filtros
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const entity = req.query.entity as string;
    const action = req.query.action as string;

    // Construir query
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('church_id', church.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplicar filtros
    if (entity) {
      query = query.eq('entity', entity);
    }
    if (action) {
      query = query.eq('action', action);
    }

    console.log('🔍 Query de logs:', {
      church_id: church.id,
      entity,
      action,
      page,
      limit,
      offset
    });

    const { data: logs, error: logsError, count } = await query;

    console.log('📊 Resultado da query:', {
      logsCount: logs?.length || 0,
      totalCount: count,
      error: logsError?.message
    });

    if (logsError) {
      return res.status(500).json({
        error: 'Erro ao buscar logs',
        details: logsError.message
      });
    }

    res.json({
      message: 'Logs recuperados com sucesso',
      data: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

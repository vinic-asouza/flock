import { Request, Response } from 'express';
import supabase, { supabaseAdmin } from '../services/supabase';
import { AuthRequest } from '../types';
import { validateChangePassword, validateResetPassword } from '../validators/passwordValidator';
import { sendEmail } from '../services/emailService';
import { getPasswordChangedTemplate } from '../templates/emailTemplates';

/**
 * Envia email para recuperação de senha
 */
export const forgotPassword = async (req: Request<{}, {}, { email: string }>, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email não fornecido',
        details: 'O email é obrigatório para recuperação de senha'
      });
    }

    // ACHADO 14: validar formato do email antes de chamar o Supabase para evitar erros
    // opacos em inglês retornados diretamente pelo Supabase Auth
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Email inválido',
        details: 'Informe um endereço de email válido'
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password`
    });

    if (error) {
      return res.status(400).json({
        error: 'Erro ao solicitar recuperação de senha',
        details: error.message
      });
    }

    res.json({
      message: 'Email de recuperação enviado com sucesso',
      details: 'Por favor, verifique sua caixa de entrada'
    });

  } catch (error) {
    console.error('Erro na recuperação de senha:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Altera a senha do usuário logado
 */
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Validar dados da requisição
    const { error: validationError } = validateChangePassword({ currentPassword, newPassword });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message)
      });
    }

    // Primeiro verificamos se a senha atual está correta
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

    // Se a senha atual estiver correta, atualizamos para a nova senha
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
      details: 'Sua senha foi atualizada. Por favor, use a nova senha para seus próximos logins'
    });

  } catch (error) {
    console.error('Erro na alteração de senha:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Redefine a senha usando o token de recuperação
 */
export const resetPassword = async (req: Request<{}, {}, { newPassword: string, token: string }>, res: Response) => {
  try {
    const { newPassword, token } = req.body;

    // Validar dados da requisição
    const { error: validationError } = validateResetPassword({ newPassword, token });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message)
      });
    }

    // Validar o token de recuperação e obter o usuário
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(400).json({
        error: 'Token inválido ou expirado',
        details: userError?.message || 'Não foi possível validar o token'
      });
    }

    // ACHADO 13: o código anterior usava setSession({ access_token: token, refresh_token: token })
    // com o mesmo valor para ambos os campos — semanticamente incorreto e frágil.
    // O fluxo correto server-side é atualizar a senha via Admin API usando o user.id
    // já validado acima, sem precisar criar uma sessão temporária.
    if (!supabaseAdmin) {
      console.error('[resetPassword] SUPABASE_SERVICE_ROLE_KEY não configurada — supabaseAdmin indisponível.');
      return res.status(503).json({
        error: 'Serviço temporariamente indisponível',
        details: 'Não foi possível redefinir sua senha no momento. Tente novamente mais tarde ou entre em contato com o suporte.'
      });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword
    });

    if (updateError) {
      return res.status(400).json({
        error: 'Erro ao redefinir senha',
        details: updateError.message
      });
    }

    // Enviar email de confirmação (não bloquear o fluxo se der erro)
    try {
      const userEmail = user.email || '';
      const userName = userEmail.split('@')[0] || 'Usuário';
      const changeDate = new Date().toLocaleString('pt-BR', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo'
      });
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      await sendEmail({
        to: userEmail,
        subject: 'Senha Redefinida - Flock',
        html: getPasswordChangedTemplate({
          userName,
          changeDate,
          ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
        }),
      });
    } catch (emailError) {
      // Logar erro mas não quebrar o fluxo de redefinição de senha
      console.error('Erro ao enviar email de confirmação de redefinição de senha:', emailError);
    }

    res.json({
      message: 'Senha redefinida com sucesso',
      details: 'Sua senha foi atualizada. Por favor, use a nova senha para seus próximos logins'
    });

  } catch (error) {
    console.error('Erro na redefinição de senha:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}; 
import { Request, Response } from 'express';
import supabase from '../services/supabase';
import { AuthRequest } from '../types';
import { validateEmailChange, validatePasswordChange, validateAccountDeletion } from '../validators/accountValidator';

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

    // Atualizar email com redirecionamento para o callback do frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
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

    // Excluir usuário do Supabase Auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(req.user.id);

    if (deleteError) {
      return res.status(400).json({
        error: 'Erro ao excluir conta',
        details: deleteError.message
      });
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

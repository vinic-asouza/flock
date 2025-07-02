import { Request, Response } from 'express';
import supabase from '../services/supabase';
import { AuthRequest } from '../types';

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

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONT_URL || 'http://localhost:3000'}/reset-password`
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

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: 'Senha atual e nova senha são obrigatórias'
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

    if (!newPassword) {
      return res.status(400).json({
        error: 'Senha não fornecida',
        details: 'A nova senha é obrigatória'
      });
    }

    if (!token) {
      return res.status(400).json({
        error: 'Token não fornecido',
        details: 'O token de recuperação é obrigatório'
      });
    }

    // Para reset de senha com token, precisamos primeiro verificar se o token é válido
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(400).json({
        error: 'Token inválido ou expirado',
        details: userError?.message || 'Não foi possível validar o token'
      });
    }

    // Agora vamos atualizar a senha usando o token diretamente
    // Para isso, precisamos criar uma sessão temporária
    const { data: { session }, error: sessionError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: token
    });

    if (sessionError || !session) {
      return res.status(400).json({
        error: 'Erro ao criar sessão temporária',
        details: sessionError?.message || 'Não foi possível criar uma sessão válida'
      });
    }

    // Agora podemos atualizar a senha
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return res.status(400).json({
        error: 'Erro ao redefinir senha',
        details: updateError.message
      });
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
import { Request, Response } from 'express';
import supabase from '../services/supabase';
import { setAccessToken, setRefreshToken, setSessionCookie } from '../utils/cookieUtils';

/**
 * Processar callback de confirmação de email
 */
export const handleAuthCallback = async (req: Request, res: Response) => {
  try {
    const { access_token, refresh_token } = req.body;

    if (!access_token || !refresh_token) {
      return res.status(400).json({
        error: 'Tokens não fornecidos',
        details: 'Access token e refresh token são obrigatórios'
      });
    }

    // Verificar se os tokens são válidos
    const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);
    
    if (userError || !user) {
      return res.status(400).json({
        error: 'Tokens inválidos',
        details: 'Os tokens fornecidos são inválidos ou expiraram'
      });
    }

    // Verificar se o email foi confirmado
    if (!user.email_confirmed_at) {
      return res.status(400).json({
        error: 'Email não confirmado',
        details: 'O email ainda não foi confirmado'
      });
    }

    // Configurar cookies de autenticação
    setAccessToken(res, access_token);
    setRefreshToken(res, refresh_token);
    setSessionCookie(res, { user, access_token, refresh_token });

    res.json({
      message: 'Email confirmado com sucesso',
      details: 'Sua conta foi ativada e você está logado',
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at
      }
    });

  } catch (error) {
    console.error('Erro no callback de autenticação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

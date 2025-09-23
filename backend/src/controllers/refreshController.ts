import { Request, Response } from 'express';
import supabase from '../services/supabase';
import { setAccessToken, setRefreshToken, setSessionCookie, clearAuthCookies, cookieConfig } from '../utils/cookieUtils';

/**
 * Renova o token de acesso usando o refresh token
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Obter refresh token do cookie
    const refreshToken = req.cookies[cookieConfig.names.refreshToken];
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token não fornecido',
        details: 'Faça login novamente'
      });
    }

    // Renovar sessão no Supabase
    const { data: authData, error: authError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (authError || !authData.session) {
      // Refresh token inválido, limpar cookies
      clearAuthCookies(res);
      return res.status(401).json({
        error: 'Refresh token inválido',
        details: 'Faça login novamente'
      });
    }

    // Atualizar cookies com novos tokens
    setAccessToken(res, authData.session.access_token);
    setRefreshToken(res, authData.session.refresh_token);
    setSessionCookie(res, {
      user: authData.user,
      expires_at: authData.session.expires_at
    });

    res.json({
      message: 'Token renovado com sucesso',
      expires_at: authData.session.expires_at
    });

  } catch (error) {
    console.error('Erro ao renovar token:', error);
    clearAuthCookies(res);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Verifica se o usuário está autenticado (usado para verificar estado no frontend)
 */
export const checkAuth = async (req: Request, res: Response) => {
  try {
    const accessToken = req.cookies[cookieConfig.names.accessToken];
    
    if (!accessToken) {
      return res.status(200).json({
        authenticated: false,
        message: 'Usuário não autenticado'
      });
    }

    // Verificar se o token é válido
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return res.status(200).json({
        authenticated: false,
        message: 'Token inválido'
      });
    }

    // Buscar dados da igreja
    const { data: churchData, error: churchError } = await supabase
      .from('churches')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (churchError) {
      return res.status(200).json({
        authenticated: false,
        message: 'Igreja não encontrada'
      });
    }

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email
      },
      church: churchData
    });

  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    res.status(200).json({
      authenticated: false,
      message: 'Erro interno do servidor'
    });
  }
};

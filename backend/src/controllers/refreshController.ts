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
    let accessToken = req.cookies[cookieConfig.names.accessToken];
    let user: any | null = null;

    // 1) Tentar validar com o access token atual (se existir)
    if (accessToken) {
      const { data: { user: supaUser }, error } = await supabase.auth.getUser(accessToken);
      if (!error && supaUser) {
        user = supaUser;
      }
    }

    // 2) Se não houver usuário válido, tentar renovar usando o refresh token
    if (!user) {
      const refreshTokenCookie = req.cookies[cookieConfig.names.refreshToken];

      if (!refreshTokenCookie) {
        // Não há nenhum token utilizável - considerar não autenticado
        return res.status(200).json({
          authenticated: false,
          message: 'Usuário não autenticado'
        });
      }

      const { data: authData, error: authError } = await supabase.auth.refreshSession({
        refresh_token: refreshTokenCookie
      });

      if (authError || !authData.session) {
        // Refresh token inválido/expirado - limpar cookies e considerar deslogado
        clearAuthCookies(res);
        return res.status(200).json({
          authenticated: false,
          message: 'Sessão expirada'
        });
      }

      // Atualizar cookies com nova sessão
      setAccessToken(res, authData.session.access_token);
      setRefreshToken(res, authData.session.refresh_token);
      setSessionCookie(res, {
        user: authData.user,
        expires_at: authData.session.expires_at
      });

      accessToken = authData.session.access_token;
      user = authData.user;
    }

    // 3) Se ainda assim não houver usuário, considerar token inválido
    if (!user) {
      return res.status(200).json({
        authenticated: false,
        message: 'Token inválido'
      });
    }

    // 4) Buscar dados da igreja vinculada ao usuário autenticado
    const { data: churchData, error: churchError } = await supabase
      .from('churches')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (churchError || !churchData) {
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

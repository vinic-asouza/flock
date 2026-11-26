import { Response } from 'express';

type SameSiteOption = 'none' | 'lax' | 'strict';

/**
 * Produção first-party (api.* + painel.* no mesmo eTLD+1): Lax.
 * Override: COOKIE_SAMESITE=none|lax|strict (útil na janela de transição).
 */
export const resolveSameSite = (): SameSiteOption => {
  const fromEnv = process.env.COOKIE_SAMESITE?.toLowerCase();
  if (fromEnv === 'none' || fromEnv === 'lax' || fromEnv === 'strict') {
    return fromEnv;
  }
  return process.env.NODE_ENV === 'production' ? 'lax' : 'lax';
};

// Configurações de cookies seguros
export const cookieConfig = {
  // Nome dos cookies
  names: {
    accessToken: 'flock_access_token',
    refreshToken: 'flock_refresh_token',
    session: 'flock_session',
    activeChurchId: 'flock_active_church_id',
    pendingLinkToken: 'flock_pending_link_token',
  },
  
  // Configurações de segurança
  security: {
    httpOnly: true, // Não acessível via JavaScript
    secure: process.env.NODE_ENV === 'production', // HTTPS apenas em produção
    // sameSite resolvido em runtime (ver resolveSameSite) — host-only no host da API
    get sameSite(): SameSiteOption {
      return resolveSameSite();
    },
    path: '/', // Disponível em toda a aplicação
  },
  
  // Tempos de expiração (em milissegundos)
  expiration: {
    accessToken: 15 * 60 * 1000, // 15 minutos
    refreshToken: 7 * 24 * 60 * 60 * 1000, // 7 dias
    session: 24 * 60 * 60 * 1000, // 24 horas
    activeChurchId: 30 * 24 * 60 * 60 * 1000, // 30 dias
    pendingLinkToken: 7 * 24 * 60 * 60 * 1000, // 7 dias (alinhado a pending_subscriptions)
  },
};

export const setPendingLinkToken = (res: Response, token: string): void => {
  res.cookie(cookieConfig.names.pendingLinkToken, token, {
    ...cookieConfig.security,
    sameSite: resolveSameSite(),
    maxAge: cookieConfig.expiration.pendingLinkToken,
  });
};

export const clearPendingLinkToken = (res: Response): void => {
  res.clearCookie(cookieConfig.names.pendingLinkToken, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: resolveSameSite(),
  });
};

export const setActiveChurchId = (res: Response, churchId: string): void => {
  res.cookie(cookieConfig.names.activeChurchId, churchId, {
    ...cookieConfig.security,
    sameSite: resolveSameSite(),
    maxAge: cookieConfig.expiration.activeChurchId,
  });
};

export const clearActiveChurchId = (res: Response): void => {
  res.clearCookie(cookieConfig.names.activeChurchId, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: resolveSameSite(),
  });
};

// Função para definir cookie de acesso
export const setAccessToken = (res: Response, token: string): void => {
  res.cookie(cookieConfig.names.accessToken, token, {
    ...cookieConfig.security,
    sameSite: resolveSameSite(),
    maxAge: cookieConfig.expiration.accessToken
  });
};

// Função para definir cookie de refresh
export const setRefreshToken = (res: Response, token: string): void => {
  res.cookie(cookieConfig.names.refreshToken, token, {
    ...cookieConfig.security,
    sameSite: resolveSameSite(),
    maxAge: cookieConfig.expiration.refreshToken
  });
};

// Função para definir cookie de sessão
export const setSessionCookie = (res: Response, sessionData: any): void => {
  res.cookie(cookieConfig.names.session, JSON.stringify(sessionData), {
    ...cookieConfig.security,
    sameSite: resolveSameSite(),
    maxAge: cookieConfig.expiration.session
  });
};

// Função para limpar todos os cookies de autenticação
export const clearAuthCookies = (res: Response): void => {
  const cookieNames = Object.values(cookieConfig.names);
  
  console.log('Limpando cookies:', cookieNames);
  
  cookieNames.forEach(cookieName => {
    // Limpar com diferentes configurações para garantir que seja removido
    // HTTP em desenvolvimento
    res.clearCookie(cookieName, {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });
    
    // HTTPS em produção com sameSite: 'strict'
    res.clearCookie(cookieName, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    });
    
    // HTTPS em produção com sameSite: 'lax' (first-party)
    res.clearCookie(cookieName, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    });

    // HTTPS em produção com sameSite: 'none' (legado cross-origin)
    res.clearCookie(cookieName, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    
    // Limpar sem configurações específicas
    res.clearCookie(cookieName);
  });
  
  console.log('Cookies limpos com sucesso');
};

// Função para obter configuração de cookie para desenvolvimento
export const getDevCookieConfig = () => {
  return {
    ...cookieConfig.security,
    secure: false, // Permitir HTTP em desenvolvimento
    sameSite: 'lax' as const // Mais permissivo em desenvolvimento
  };
};

// Função para obter configuração de cookie para produção
export const getProdCookieConfig = () => {
  return {
    ...cookieConfig.security,
    secure: true, // Apenas HTTPS em produção
    sameSite: resolveSameSite(),
  };
};

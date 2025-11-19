import { Response } from 'express';

// Configurações de cookies seguros
export const cookieConfig = {
  // Nome dos cookies
  names: {
    accessToken: 'flock_access_token',
    refreshToken: 'flock_refresh_token',
    session: 'flock_session'
  },
  
  // Configurações de segurança
  security: {
    httpOnly: true, // Não acessível via JavaScript
    secure: process.env.NODE_ENV === 'production', // HTTPS apenas em produção
    // sameSite: 'none' é necessário para cross-origin (frontend e backend em domínios diferentes)
    // Quando sameSite é 'none', secure DEVE ser true
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
    path: '/', // Disponível em toda a aplicação
  },
  
  // Tempos de expiração (em milissegundos)
  expiration: {
    accessToken: 15 * 60 * 1000, // 15 minutos
    refreshToken: 7 * 24 * 60 * 60 * 1000, // 7 dias
    session: 24 * 60 * 60 * 1000 // 24 horas
  }
};

// Função para definir cookie de acesso
export const setAccessToken = (res: Response, token: string): void => {
  res.cookie(cookieConfig.names.accessToken, token, {
    ...cookieConfig.security,
    maxAge: cookieConfig.expiration.accessToken
  });
};

// Função para definir cookie de refresh
export const setRefreshToken = (res: Response, token: string): void => {
  res.cookie(cookieConfig.names.refreshToken, token, {
    ...cookieConfig.security,
    maxAge: cookieConfig.expiration.refreshToken
  });
};

// Função para definir cookie de sessão
export const setSessionCookie = (res: Response, sessionData: any): void => {
  res.cookie(cookieConfig.names.session, JSON.stringify(sessionData), {
    ...cookieConfig.security,
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
    
    // HTTPS em produção com sameSite: 'none' (cross-origin)
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
    // sameSite: 'none' é necessário para cross-origin (frontend e backend em domínios diferentes)
    // Quando sameSite é 'none', secure DEVE ser true
    sameSite: 'none' as const
  };
};

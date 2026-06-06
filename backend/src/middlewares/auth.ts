import { Response, NextFunction } from 'express';
import supabase from '../services/supabase';
import { attachChurchContext } from '../services/churchContext';
import { AuthRequest } from '../types';
import { cookieConfig, setAccessToken, setRefreshToken, setSessionCookie } from '../utils/cookieUtils';

/**
 * Tenta renovar o access token usando o refresh token
 * Retorna o novo access token se bem-sucedido, null caso contrário
 */
const tryRefreshToken = async (req: AuthRequest, res: Response): Promise<string | null> => {
  try {
    // Obter refresh token do cookie
    const refreshToken = req.cookies[cookieConfig.names.refreshToken];
    
    if (!refreshToken) {
      console.log('Refresh token não encontrado para renovação automática');
      return null;
    }

    // Renovar sessão no Supabase
    const { data: authData, error: authError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (authError || !authData.session) {
      console.log('Erro ao renovar token:', authError?.message || 'Sessão não retornada');
      return null;
    }

    // Atualizar cookies com novos tokens
    setAccessToken(res, authData.session.access_token);
    setRefreshToken(res, authData.session.refresh_token);
    setSessionCookie(res, {
      user: authData.user,
      expires_at: authData.session.expires_at
    });

    console.log('Token renovado automaticamente com sucesso');
    return authData.session.access_token;

  } catch (error) {
    console.error('Erro ao tentar renovar token:', error);
    return null;
  }
};

/**
 * Verifica se um token JWT está expirado
 */
const isTokenExpired = (token: string): boolean => {
  try {
    const tokenPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const currentTime = Math.floor(Date.now() / 1000);
    return tokenPayload.exp < currentTime;
  } catch (error) {
    // Se não conseguir decodificar, considerar como expirado
    return true;
  }
};

/**
 * Autentica usuário sem exigir igreja ativa (rotas de seleção de igreja).
 */
export const authUserOnly = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token = req.cookies[cookieConfig.names.accessToken];
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token || isTokenExpired(token)) {
      const newToken = await tryRefreshToken(req, res);
      if (newToken) {
        token = newToken;
      } else if (!token) {
        return res.status(401).json({
          error: 'Token não fornecido',
          details: 'Faça login para acessar este recurso',
        });
      }
    }

    if (global.tokenBlacklist?.has(token!)) {
      return res.status(401).json({
        error: 'Token revogado',
        details: 'Este token foi invalidado. Faça login novamente.',
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token!);
    if (error || !user) {
      return res.status(401).json({
        error: 'Token inválido ou expirado',
        details: 'Faça login novamente para continuar',
      });
    }

    req.user = { id: user.id, email: user.email || '' };
    next();
  } catch (err) {
    console.error('Erro na autenticação (user only):', err);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Primeiro, tentar obter token do cookie (método preferido)
    let token = req.cookies[cookieConfig.names.accessToken];
    
    // Se não houver token no cookie, tentar do header Authorization (fallback)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        token = authHeader.split(' ')[1];
      }
    }

    // Se não há token ou está expirado, tentar renovar usando refresh token
    let tokenRenewed = false;
    if (!token) {
      // Sem token, tentar renovar
      const newToken = await tryRefreshToken(req, res);
      if (newToken) {
        token = newToken;
        tokenRenewed = true;
      } else {
        return res.status(401).json({
          error: 'Token não fornecido',
          details: 'Faça login para acessar este recurso'
        });
      }
    } else if (isTokenExpired(token)) {
      // Token expirado, tentar renovar
      console.log('Access token expirado, tentando renovar automaticamente...');
      const newToken = await tryRefreshToken(req, res);
      if (newToken) {
        token = newToken;
        tokenRenewed = true;
      }
      // Se não conseguiu renovar, continua com o token existente para tentar validar
      // (pode ser um falso positivo na verificação de expiração)
    }

    // Verificar se o token está na blacklist (tokens revogados)
    if (global.tokenBlacklist && global.tokenBlacklist.has(token)) {
      return res.status(401).json({
        error: 'Token revogado',
        details: 'Este token foi invalidado. Faça login novamente.'
      });
    }

    // Verificar o token com o Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Se o token está inválido e não tentamos renovar ainda, tentar renovar agora
      if (!tokenRenewed) {
        console.log('Token inválido, tentando renovar automaticamente...');
        const newToken = await tryRefreshToken(req, res);
        if (newToken) {
          // Tentar validar o novo token
          const { data: newUserData, error: newError } = await supabase.auth.getUser(newToken);
          if (!newError && newUserData.user) {
            req.user = {
              id: newUserData.user.id,
              email: newUserData.user.email || ''
            };
            const attached = await attachChurchContext(req, res);
            if (!attached.ok) {
              if (attached.reason === 'selection_required') {
                return res.status(403).json({
                  error: 'Seleção de igreja obrigatória',
                  code: 'CHURCH_SELECTION_REQUIRED',
                  memberships: attached.memberships,
                });
              }
              return res.status(403).json({
                error: 'Sem acesso a nenhuma igreja',
                details: 'Sua conta não está vinculada a uma igreja.',
              });
            }
            return next();
          }
        }
      }
      
      return res.status(401).json({
        error: 'Token inválido ou expirado',
        details: 'Faça login novamente para continuar'
      });
    }

    // Adicionar o usuário ao objeto da requisição
    req.user = {
      id: user.id,
      email: user.email || ''
    };

    const attached = await attachChurchContext(req, res);
    if (!attached.ok) {
      if (attached.reason === 'selection_required') {
        return res.status(403).json({
          error: 'Seleção de igreja obrigatória',
          code: 'CHURCH_SELECTION_REQUIRED',
          memberships: attached.memberships,
        });
      }
      return res.status(403).json({
        error: 'Sem acesso a nenhuma igreja',
        details: 'Sua conta não está vinculada a uma igreja.',
      });
    }
    next();

  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Middleware de autenticação opcional
 * Tenta autenticar, mas não retorna erro se não houver token
 */
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Primeiro, tentar obter token do cookie
    let token = req.cookies[cookieConfig.names.accessToken];
    
    // Se não houver token no cookie, tentar do header Authorization
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        token = authHeader.split(' ')[1];
      }
    }

    // Se não há token, apenas continuar sem autenticação
    if (!token) {
      console.log('🔓 optionalAuth: Nenhum token encontrado, continuando sem autenticação');
      return next();
    }

    // Verificar se o token está na blacklist
    if (global.tokenBlacklist && global.tokenBlacklist.has(token)) {
      console.log('🔓 optionalAuth: Token na blacklist, continuando sem autenticação');
      return next(); // Continuar sem autenticação se token foi revogado
    }

    // Verificar o token com o Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.log('⚠️ optionalAuth: Erro ao validar token:', error.message);
      // Tentar renovar token se expirado
      const newToken = await tryRefreshToken(req, res);
      if (newToken) {
        const { data: newUserData, error: newError } = await supabase.auth.getUser(newToken);
        if (!newError && newUserData.user) {
          req.user = {
            id: newUserData.user.id,
            email: newUserData.user.email || ''
          };
          await attachChurchContext(req, res);
          console.log('✅ optionalAuth: Token renovado e usuário autenticado');
        }
      }
    } else if (user) {
      // Adicionar o usuário ao objeto da requisição
      req.user = {
        id: user.id,
        email: user.email || ''
      };
      await attachChurchContext(req, res);
      console.log('✅ optionalAuth: Usuário autenticado:', user.id);
    }

    next();
  } catch (error) {
    // Em caso de erro, apenas continuar sem autenticação
    console.error('❌ Erro na autenticação opcional:', error);
    next();
  }
};

export default authMiddleware; 
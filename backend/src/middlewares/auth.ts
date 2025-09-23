import { Response, NextFunction } from 'express';
import supabase from '../services/supabase';
import { AuthRequest } from '../types';
import { cookieConfig } from '../utils/cookieUtils';

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

    if (!token) {
      return res.status(401).json({
        error: 'Token não fornecido',
        details: 'Faça login para acessar este recurso'
      });
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
      return res.status(401).json({
        error: 'Token inválido ou expirado'
      });
    }

    // Adicionar o usuário ao objeto da requisição
    req.user = {
      id: user.id,
      email: user.email || ''
    };
    next();

  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export default authMiddleware; 
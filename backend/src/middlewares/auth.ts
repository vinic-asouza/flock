import { Response, NextFunction } from 'express';
import supabase from '../services/supabase';
import { AuthRequest } from '../types';

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Verificar se o token está presente no header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: 'Token não fornecido'
      });
    }

    // Extrair o token do header (formato: "Bearer TOKEN")
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        error: 'Formato de token inválido'
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
    req.user = user;
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
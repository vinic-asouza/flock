import { Request, Response } from 'express';
import supabase from '../services/supabase';
import { AuthRequest } from '../types';
import { listChurchMembershipsForUser } from '../services/churchContext';
import { evaluatePlatformOperatorAccess } from '../services/platformAdmin';
import { validateOpsLogin } from '../validators/opsAuthValidator';
import {
  setAccessToken,
  setRefreshToken,
  setSessionCookie,
  clearActiveChurchId,
} from '../utils/cookieUtils';

export const opsLogin = async (
  req: Request<{}, {}, { email: string; password: string }>,
  res: Response
) => {
  try {
    const { error: validationError, value } = validateOpsLogin(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map((detail) => detail.message),
      });
    }

    const { email, password } = value;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      const raw = (authError?.message || '').toLowerCase();
      const isUnconfirmed =
        raw.includes('not confirmed') ||
        raw.includes('confirm your email') ||
        raw.includes('email not confirmed');
      if (isUnconfirmed) {
        return res.status(401).json({
          error: 'Email não confirmado',
          details: 'Necessário realizar confirmação de email. Verifique sua caixa de entrada.',
        });
      }
      return res.status(401).json({
        error: 'Credenciais inválidas',
        details: authError?.message,
      });
    }

    const memberships = await listChurchMembershipsForUser(authData.user.id);
    const decision = evaluatePlatformOperatorAccess({
      email: authData.user.email,
      membershipCount: memberships.length,
    });

    if (!decision.allowed) {
      return res.status(decision.status).json({
        error: decision.error,
        details: decision.details,
      });
    }

    if (!authData.session) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        details: 'Sessão não retornada pelo provedor de autenticação.',
      });
    }

    clearActiveChurchId(res);
    setAccessToken(res, authData.session.access_token);
    setRefreshToken(res, authData.session.refresh_token);
    setSessionCookie(res, {
      user: authData.user,
      expires_at: authData.session.expires_at,
    });

    return res.json({
      message: 'Login realizado com sucesso',
      id: authData.user.id,
      email: authData.user.email,
    });
  } catch (error) {
    console.error('Erro no login do Admin OPS:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

export const getOpsMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    return res.json({
      id: req.user.id,
      email: req.user.email,
    });
  } catch (error) {
    console.error('Erro em GET /api/ops/me:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

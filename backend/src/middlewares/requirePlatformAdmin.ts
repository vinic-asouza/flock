import { Response, NextFunction } from 'express';
import { listChurchMembershipsForUser } from '../services/churchContext';
import { evaluatePlatformOperatorAccess } from '../services/platformAdmin';
import { AuthRequest } from '../types';

/**
 * Requires an authenticated user with no church context.
 * Call after `authUserOnly` — never `attachChurchContext`.
 */
export const requirePlatformAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const memberships = await listChurchMembershipsForUser(req.user.id);
    const decision = evaluatePlatformOperatorAccess({
      email: req.user.email,
      membershipCount: memberships.length,
    });

    if (!decision.allowed) {
      return res.status(decision.status).json({
        error: decision.error,
        details: decision.details,
      });
    }

    next();
  } catch (error) {
    console.error('Erro na autorização do Admin OPS:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

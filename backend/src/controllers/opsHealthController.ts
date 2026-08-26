import { Response } from 'express';
import { AuthRequest } from '../types';
import { logError } from '../utils/logger';
import { getOpsHealthData } from '../services/opsHealth';

/**
 * @remarks GET /api/ops/health — saúde agregada (API, Stripe, jobs de billing).
 * Auth: authUserOnly + requirePlatformAdmin. Read-only. HTTP 200 mesmo se um componente estiver ruim.
 */
export const getOpsHealth = async (_req: AuthRequest, res: Response) => {
  try {
    const health = await getOpsHealthData();
    return res.json(health);
  } catch (err) {
    logError('Erro ao buscar saúde do Admin OPS', err);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: 'Não foi possível carregar a saúde dos sistemas.',
    });
  }
};

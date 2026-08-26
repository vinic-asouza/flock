import { Response } from 'express';
import { AuthRequest } from '../types';
import { logError } from '../utils/logger';
import { validateOpsWaitlistListQuery } from '../validators/opsWaitlistValidator';
import { listOpsWaitlistData } from '../services/opsWaitlist';

function joiDetails(error: { details: { message: string }[] }): string[] {
  return error.details.map((detail) => detail.message);
}

/**
 * @remarks GET /api/ops/waitlist — lista paginada de leads da Lista de espera.
 * Auth: authUserOnly + requirePlatformAdmin. Read-only. BR-OPS-008.
 */
export const listOpsWaitlist = async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = validateOpsWaitlistListQuery(req.query);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: joiDetails(validationError),
      });
    }

    const result = await listOpsWaitlistData(value);
    return res.json(result);
  } catch (err) {
    logError(
      'Erro ao listar waitlist do Admin OPS',
      err instanceof Error ? err.message : 'erro desconhecido'
    );
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: 'Não foi possível listar os leads da Lista de espera.',
    });
  }
};

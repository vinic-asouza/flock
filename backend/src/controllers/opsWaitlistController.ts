import { Response } from 'express';
import { AuthRequest } from '../types';
import { logError } from '../utils/logger';
import {
  validateOpsWaitlistIdParams,
  validateOpsWaitlistListQuery,
  validateOpsWaitlistPatch,
} from '../validators/opsWaitlistValidator';
import {
  listOpsWaitlistData,
  patchOpsWaitlistStatus,
} from '../services/opsWaitlist';

function joiDetails(error: { details: { message: string }[] }): string[] {
  return error.details.map((detail) => detail.message);
}

/**
 * @remarks GET /api/ops/waitlist — lista paginada de leads da Lista de espera.
 * Auth: authUserOnly + requirePlatformAdmin. BR-OPS-008.
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

/**
 * @remarks PATCH /api/ops/waitlist/:id — marca lead como converted ou discarded.
 * Só a partir de pending. Não cria Igreja.
 */
export const patchOpsWaitlist = async (req: AuthRequest, res: Response) => {
  try {
    const params = validateOpsWaitlistIdParams(req.params);
    if (params.error) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: joiDetails(params.error),
      });
    }

    const body = validateOpsWaitlistPatch(req.body);
    if (body.error) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: joiDetails(body.error),
      });
    }

    const operatorId = req.user?.id;
    if (!operatorId) {
      return res.status(401).json({
        error: 'Não autenticado',
        details: 'Faça login novamente.',
      });
    }

    const result = await patchOpsWaitlistStatus(
      params.value.id,
      body.value.status,
      operatorId
    );

    if (result.kind === 'not_found') {
      return res.status(404).json({
        error: 'Lead não encontrado',
        details: 'Este lead não existe na Lista de espera.',
      });
    }

    if (result.kind === 'conflict') {
      return res.status(409).json({
        error: 'Lead já não está pendente',
        details: 'Só é possível converter ou excluir um lead pendente.',
      });
    }

    return res.json(result.item);
  } catch (err) {
    logError(
      'Erro ao atualizar waitlist do Admin OPS',
      err instanceof Error ? err.message : 'erro desconhecido'
    );
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: 'Não foi possível atualizar o lead da Lista de espera.',
    });
  }
};

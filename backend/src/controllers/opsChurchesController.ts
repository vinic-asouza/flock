import { Response } from 'express';
import { AuthRequest } from '../types';
import { logError } from '../utils/logger';
import {
  validateOpsChurchIdParams,
  validateOpsChurchListQuery,
} from '../validators/opsChurchesValidator';
import {
  getOpsChurchDetailData,
  getOpsOverviewData,
  listOpsChurchesData,
} from '../services/opsChurches';

function joiDetails(error: { details: { message: string }[] }): string[] {
  return error.details.map((detail) => detail.message);
}

/**
 * @remarks GET /api/ops/overview — totais comerciais de Igrejas (plataforma).
 * Auth: authUserOnly + requirePlatformAdmin. Read-only.
 */
export const getOpsOverview = async (req: AuthRequest, res: Response) => {
  try {
    const overview = await getOpsOverviewData();
    return res.json(overview);
  } catch (err) {
    logError('Erro ao buscar overview do Admin OPS', err);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: 'Não foi possível carregar o overview.',
    });
  }
};

/**
 * @remarks GET /api/ops/churches — lista paginada + busca de Igrejas (plataforma).
 * Auth: authUserOnly + requirePlatformAdmin. Read-only.
 */
export const listOpsChurches = async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = validateOpsChurchListQuery(req.query);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: joiDetails(validationError),
      });
    }

    const result = await listOpsChurchesData(value);
    return res.json(result);
  } catch (err) {
    logError('Erro ao listar igrejas do Admin OPS', err);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: 'Não foi possível listar as igrejas.',
    });
  }
};

/**
 * @remarks GET /api/ops/churches/:id — ficha read-only da Igreja (plataforma).
 * Auth: authUserOnly + requirePlatformAdmin. Sem PII de Membros.
 */
export const getOpsChurch = async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = validateOpsChurchIdParams(req.params);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: joiDetails(validationError),
      });
    }

    const detail = await getOpsChurchDetailData(value.id);
    if (!detail) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não existe igreja com este identificador.',
      });
    }

    return res.json(detail);
  } catch (err) {
    logError('Erro ao buscar ficha da igreja no Admin OPS', err);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: 'Não foi possível carregar a ficha da igreja.',
    });
  }
};

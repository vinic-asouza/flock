import { Response } from 'express';
import { AuthRequest } from '../types';
import { logError } from '../utils/logger';
import { buildHttpLatencyPayload } from '../utils/httpLatencyPayload';

/**
 * @remarks GET /api/ops/http-latency — p50/p95 HTTP por rota (janela = uptime do processo).
 * Auth: authUserOnly + requirePlatformAdmin. Read-only.
 * BR-OPS-009: em processo, sem METRICS_TOKEN no browser.
 */
export const getOpsHttpLatency = (_req: AuthRequest, res: Response) => {
  try {
    return res.json(buildHttpLatencyPayload());
  } catch (err) {
    logError('Erro ao buscar latência HTTP do Admin OPS', err);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: 'Não foi possível carregar a latência da API.',
    });
  }
};

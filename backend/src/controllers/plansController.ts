import { Request, Response } from 'express';
// ACHADO 14: substituído require() dinâmico dentro das funções por import estático no topo
import { getAllPlans, getPlanConfig, getPaidPlans, PLAN_CONFIG } from '../config/plans';

/**
 * Obter todos os planos disponíveis
 * GET /api/plans
 */
export const getPlans = async (_req: Request, res: Response) => {
  try {
    const plans = getAllPlans();
    res.json({
      plans: plans.map(plan => ({
        id: Object.keys(PLAN_CONFIG).find(key => PLAN_CONFIG[key] === plan),
        ...plan,
      })),
    });
  } catch (error: any) {
    console.error('Erro ao obter planos:', error);
    res.status(500).json({
      error: 'Erro ao obter planos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Obter planos pagos
 * GET /api/plans/paid
 */
export const getPaidPlansList = async (_req: Request, res: Response) => {
  try {
    const plans = getPaidPlans();
    res.json({
      plans: plans.map(plan => ({
        id: Object.keys(PLAN_CONFIG).find(key => PLAN_CONFIG[key] === plan),
        ...plan,
      })),
    });
  } catch (error: any) {
    console.error('Erro ao obter planos pagos:', error);
    res.status(500).json({
      error: 'Erro ao obter planos pagos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Obter configuração de um plano específico
 * GET /api/plans/:planType
 */
export const getPlan = async (req: Request, res: Response) => {
  try {
    const { planType } = req.params;
    const config = getPlanConfig(planType);

    if (!config) {
      return res.status(404).json({
        error: 'Plano não encontrado',
        details: `Plano ${planType} não existe`,
      });
    }

    res.json({
      plan: {
        id: planType,
        ...config,
      },
    });
  } catch (error: any) {
    console.error('Erro ao obter plano:', error);
    res.status(500).json({
      error: 'Erro ao obter plano',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


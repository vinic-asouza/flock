import express from 'express';
import { getPlans, getPaidPlansList, getPlan } from '../controllers/plansController';

const router = express.Router();

// Obter todos os planos
router.get('/', getPlans);

// Obter planos pagos
router.get('/paid', getPaidPlansList);

// Obter plano específico
router.get('/:planType', getPlan);

export default router;


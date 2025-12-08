import express from 'express';
import { createCheckout, createPortalSession, handleWebhook, syncSubscription, changePlan } from '../controllers/stripeController';
import { optionalAuth } from '../middlewares/auth';
import authMiddleware from '../middlewares/auth';

const router = express.Router();

// Webhook do Stripe (não precisa de autenticação, usa assinatura do Stripe)
// IMPORTANTE: Esta rota deve receber o body raw, não JSON
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

// Criar sessão de checkout (pode ser autenticado ou não)
router.post('/create-checkout-session', optionalAuth, createCheckout);

// Criar sessão do portal do cliente (requer autenticação)
router.post('/create-portal-session', authMiddleware, createPortalSession);

// Sincronizar assinatura do Stripe (requer autenticação)
router.post('/sync-subscription', authMiddleware, syncSubscription);

// Trocar plano da assinatura (requer autenticação)
router.post('/change-plan', authMiddleware, changePlan);

export default router;


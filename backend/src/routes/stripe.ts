import express from 'express';
import { createCheckout, createPortalSession, handleWebhook, syncSubscription, changePlan, activateFreePlan, checkCheckoutStatus } from '../controllers/stripeController';
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
// Adicionar express.json() para parsear o body, já que a rota do Stripe está antes do express.json() global
router.post('/create-checkout-session', express.json(), optionalAuth, createCheckout);

// Criar sessão do portal do cliente (requer autenticação)
router.post('/create-portal-session', express.json(), authMiddleware, createPortalSession);

// Sincronizar assinatura do Stripe (requer autenticação)
router.post('/sync-subscription', express.json(), authMiddleware, syncSubscription);

// Trocar plano da assinatura (requer autenticação)
router.post('/change-plan', express.json(), authMiddleware, changePlan);

// Ativar plano gratuito (requer autenticação)
router.post('/activate-free-plan', express.json(), authMiddleware, activateFreePlan);

// Verificar status de checkout (requer autenticação)
router.get('/checkout-status', authMiddleware, checkCheckoutStatus);

export default router;


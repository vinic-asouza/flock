import express from 'express';
import { createCheckout, createPortalSession, handleWebhook, syncSubscription, changePlan, activateFreePlan, checkCheckoutStatus } from '../controllers/stripeController';
import { optionalAuth } from '../middlewares/auth';
import authMiddleware from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';

const router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

router.post('/create-checkout-session', express.json(), optionalAuth, createCheckout);

// Configuração/plano: apenas admin ou owner
router.post('/create-portal-session', express.json(), authMiddleware, requireRole('admin'), createPortalSession);
router.post('/sync-subscription', express.json(), authMiddleware, requireRole('admin'), syncSubscription);
router.post('/change-plan', express.json(), authMiddleware, requireRole('admin'), changePlan);
router.post('/activate-free-plan', express.json(), authMiddleware, requireRole('admin'), activateFreePlan);
router.get('/checkout-status', authMiddleware, requireRole('admin'), checkCheckoutStatus);

export default router;


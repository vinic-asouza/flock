import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { logout } from '../controllers/authController';
import { getOpsMe, opsLogin } from '../controllers/opsAuthController';
import {
  getOpsChurch,
  getOpsOverview,
  listOpsChurches,
} from '../controllers/opsChurchesController';
import { getOpsHealth } from '../controllers/opsHealthController';
import { listOpsWaitlist } from '../controllers/opsWaitlistController';
import { authUserOnly } from '../middlewares/auth';
import { requirePlatformAdmin } from '../middlewares/requirePlatformAdmin';

const router = Router();

const opsLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Muitas tentativas de login',
    details: 'Você excedeu o limite de tentativas de login. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const opsReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    error: 'Muitas consultas no Admin OPS',
    details: 'Você excedeu o limite. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', opsLoginLimiter, opsLogin);
router.post('/logout', authUserOnly, logout);
router.get('/me', authUserOnly, requirePlatformAdmin, getOpsMe);
router.get('/overview', opsReadLimiter, authUserOnly, requirePlatformAdmin, getOpsOverview);
router.get('/churches', opsReadLimiter, authUserOnly, requirePlatformAdmin, listOpsChurches);
router.get('/churches/:id', opsReadLimiter, authUserOnly, requirePlatformAdmin, getOpsChurch);
router.get('/health', opsReadLimiter, authUserOnly, requirePlatformAdmin, getOpsHealth);
router.get('/waitlist', opsReadLimiter, authUserOnly, requirePlatformAdmin, listOpsWaitlist);

export default router;

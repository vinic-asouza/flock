import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { logout } from '../controllers/authController';
import { getOpsMe, opsLogin } from '../controllers/opsAuthController';
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

router.post('/login', opsLoginLimiter, opsLogin);
router.post('/logout', authUserOnly, logout);
router.get('/me', authUserOnly, requirePlatformAdmin, getOpsMe);

export default router;

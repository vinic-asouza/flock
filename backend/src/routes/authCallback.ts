import { Router } from 'express';
import { handleAuthCallback } from '../controllers/authCallbackController';
import rateLimit from 'express-rate-limit';

// Rate limiting para callback (mais restritivo)
const callbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    error: 'Muitas tentativas de callback',
    details: 'Tente novamente em 15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// Rota para processar callback de confirmação de email
router.post('/callback', callbackLimiter, handleAuthCallback);

export default router;

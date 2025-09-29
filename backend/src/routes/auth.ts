import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout } from '../controllers/authController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Rate limiting específico para autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas de login por IP em 15 minutos
  message: {
    error: 'Muitas tentativas de login',
    details: 'Você excedeu o limite de tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas
});

// Rate limiting específico para registro - muito restritivo
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 1 hora
  max: 10, // 10 tentativas de registro por IP em 1 hora
  message: {
    error: 'Muitas tentativas de registro',
    details: 'Você excedeu o limite de tentativas de registro. Tente novamente em 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rota de registro de igreja com rate limiting específico
router.post('/register', registerLimiter, register);

// Rota de login com rate limiting específico
router.post('/login', authLimiter, login);

// Rota de logout (requer autenticação)
router.post('/logout', authMiddleware, logout);

export default router; 
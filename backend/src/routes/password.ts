import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { forgotPassword, changePassword, resetPassword } from '../controllers/passwordController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Rate limiting específico para recuperação de senha - muito restritivo
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 tentativas de recuperação por IP em 1 hora
  message: {
    error: 'Muitas tentativas de recuperação de senha',
    details: 'Você excedeu o limite de tentativas de recuperação. Tente novamente em 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting específico para alteração de senha
const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas de alteração por IP em 15 minutos
  message: {
    error: 'Muitas tentativas de alteração de senha',
    details: 'Você excedeu o limite de tentativas de alteração. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rota pública para solicitar recuperação de senha com rate limiting
router.post('/forgot', passwordResetLimiter, forgotPassword);

// Rota pública para redefinir a senha com token com rate limiting
router.post('/reset', passwordResetLimiter, resetPassword);

// Rota protegida para alterar senha com rate limiting
router.post('/change', changePasswordLimiter, authMiddleware, changePassword);

export default router; 
import { Router } from 'express';
import { forgotPassword, changePassword, resetPassword } from '../controllers/passwordController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Rota pública para solicitar recuperação de senha
router.post('/forgot', forgotPassword);

// Rota pública para redefinir a senha com token
router.post('/reset', resetPassword);

// Rota protegida para alterar senha (requer autenticação)
router.post('/change', authMiddleware, changePassword);

export default router; 
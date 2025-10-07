import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { 
  getAccount, 
  changeEmail, 
  changePassword, 
  changePhone, 
  deleteAccount, 
  resendConfirmation,
  getAuditLogs
} from '../controllers/accountController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Rate limiting específico para operações de conta
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 operações por IP em 15 minutos
  message: {
    error: 'Muitas operações na conta',
    details: 'Você excedeu o limite de operações. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting mais restritivo para operações sensíveis
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 operações por IP em 1 hora
  message: {
    error: 'Muitas operações sensíveis',
    details: 'Você excedeu o limite de operações sensíveis. Tente novamente em 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiting e autenticação em todas as rotas
router.use(accountLimiter);
router.use(authMiddleware);

// Rota para buscar dados da conta
router.get('/', getAccount);

// Rota para alterar email
router.put('/email', sensitiveLimiter, changeEmail);

// Rota para alterar senha
router.put('/password', sensitiveLimiter, changePassword);

// Rota para alterar telefone
router.put('/phone', changePhone);

// Rota para excluir conta
router.delete('/', sensitiveLimiter, deleteAccount);

// Rota para reenviar confirmação de email
router.post('/resend-confirmation', resendConfirmation);

// Rota para listar logs de auditoria
router.get('/logs', getAuditLogs);

export default router;

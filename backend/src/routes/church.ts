import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getChurch, getMemberLimit, updateChurch } from '../controllers/churchController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Rate limiting específico para operações da igreja
const churchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // 50 operações por IP em 15 minutos
  message: {
    error: 'Muitas operações na igreja',
    details: 'Você excedeu o limite de operações. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiting e autenticação em todas as rotas
router.use(churchLimiter);
router.use(authMiddleware);

// Rota para buscar dados da igreja
router.get('/', getChurch);

// Rota para obter informações do limite de membros
router.get('/member-limit', getMemberLimit);

// Rota para atualizar dados da igreja
router.put('/', updateChurch);

export default router;

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getChurch,
  getMemberLimit,
  updateChurch,
  listMemberships,
  setActiveChurch,
} from '../controllers/churchController';
import authMiddleware, { authUserOnly } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

const churchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    error: 'Muitas operações na igreja',
    details: 'Você excedeu o limite de operações. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(churchLimiter);

router.get('/memberships', authUserOnly, listMemberships);
router.post('/active', authUserOnly, setActiveChurch);

router.use(authMiddleware);
router.use(requireRole('reader'));

router.get('/', getChurch);
router.get('/member-limit', getMemberLimit);
router.put('/', requireRole('admin'), updateChurch);

export default router;

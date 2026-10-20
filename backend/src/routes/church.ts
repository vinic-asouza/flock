import { Router } from 'express';
import {
  getChurch,
  getMemberLimit,
  updateChurch,
  listMemberships,
  setActiveChurch,
} from '../controllers/churchController';
import authMiddleware, { authUserOnly } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';
import { churchReadLimiter, churchWriteLimiter } from './churchRateLimit';

const router = Router();

router.use(churchReadLimiter);
router.use(churchWriteLimiter);

router.get('/memberships', authUserOnly, listMemberships);
router.post('/active', authUserOnly, setActiveChurch);

router.use(authMiddleware);
router.use(requireRole('reader'));

router.get('/', getChurch);
router.get('/member-limit', getMemberLimit);
router.put('/', requireRole('admin'), updateChurch);

export default router;

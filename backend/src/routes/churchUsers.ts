import { Router } from 'express';
import authMiddleware from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';
import {
  listChurchUsers,
  createChurchUser,
  updateChurchUser,
  deleteChurchUser
} from '../controllers/churchUserController';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/', listChurchUsers);
router.post('/', createChurchUser);
router.patch('/:id', updateChurchUser);
router.delete('/:id', deleteChurchUser);

export default router;

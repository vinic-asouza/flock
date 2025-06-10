import { Router } from 'express';
import { createRole, getRoles, getRole, updateRole, deleteRole } from '../controllers/roleController';
import authMiddleware from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', createRole);
router.get('/', getRoles);
router.get('/:id', getRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router; 
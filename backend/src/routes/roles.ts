import { Router } from 'express';
import { createRole, getRoles, getRole, updateRole, deleteRole, createRolesBatch } from '../controllers/roleController';
import authMiddleware from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', createRole);
router.post('/batch', createRolesBatch);
router.get('/', getRoles);
router.get('/:id', getRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router; 
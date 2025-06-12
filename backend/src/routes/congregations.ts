import { Router } from 'express';
import { createCongregation, getCongregations, getCongregation, updateCongregation, deleteCongregation } from '../controllers/congregationController';
import authMiddleware from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', createCongregation);
router.get('/', getCongregations);
router.get('/:id', getCongregation);
router.put('/:id', updateCongregation);
router.delete('/:id', deleteCongregation);

export default router; 
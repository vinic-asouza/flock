import { Router } from 'express';
import { createCongregation, getCongregations, getCongregation, updateCongregation, deleteCongregation, createCongregationsBatch } from '../controllers/congregationController';
import authMiddleware from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', createCongregation);
router.post('/batch', createCongregationsBatch);
router.get('/', getCongregations);
router.get('/:id', getCongregation);
router.put('/:id', updateCongregation);
router.delete('/:id', deleteCongregation);

export default router; 
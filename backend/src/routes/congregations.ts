import { Router } from 'express';
import { createCongregation, getCongregations, getCongregation, updateCongregation, deleteCongregation, createCongregationsBatch } from '../controllers/congregationController';
import authMiddleware from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('reader'));

router.post('/', requireRole('editor'), createCongregation);
router.post('/batch', requireRole('editor'), createCongregationsBatch);
router.get('/', getCongregations);
router.get('/:id', getCongregation);
router.put('/:id', requireRole('editor'), updateCongregation);
router.delete('/:id', requireRole('editor'), deleteCongregation);

export default router; 
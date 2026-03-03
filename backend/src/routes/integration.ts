import { Router } from 'express';
import authMiddleware from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';
import {
  listIntegrationMembers,
  getIntegrationMember,
  createIntegrationMember,
  updateIntegrationMember,
  deleteIntegrationMember,
  convertIntegrationMember
} from '../controllers/integrationController';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('reader'));

router.get('/', listIntegrationMembers);
router.get('/:id', getIntegrationMember);
router.post('/', requireRole('editor'), createIntegrationMember);
router.put('/:id', requireRole('editor'), updateIntegrationMember);
router.delete('/:id', requireRole('editor'), deleteIntegrationMember);
router.post('/:id/convert', requireRole('editor'), convertIntegrationMember);

export default router;


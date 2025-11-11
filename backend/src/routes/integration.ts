import { Router } from 'express';
import authMiddleware from '../middlewares/auth';
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

router.get('/', listIntegrationMembers);
router.get('/:id', getIntegrationMember);
router.post('/', createIntegrationMember);
router.put('/:id', updateIntegrationMember);
router.delete('/:id', deleteIntegrationMember);
router.post('/:id/convert', convertIntegrationMember);

export default router;


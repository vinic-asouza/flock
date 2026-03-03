import { Router } from 'express';
import {
  listIntegrationLinks,
  getIntegrationLink,
  createIntegrationLink,
  updateIntegrationLink,
  deactivateIntegrationLink,
  deleteIntegrationLink
} from '../controllers/integrationLinkController';
import authMiddleware from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('reader'));

router.get('/', listIntegrationLinks);
router.post('/', requireRole('editor'), createIntegrationLink);
router.patch('/:id/deactivate', requireRole('editor'), deactivateIntegrationLink);
router.get('/:id', getIntegrationLink);
router.put('/:id', requireRole('editor'), updateIntegrationLink);
router.delete('/:id', requireRole('editor'), deleteIntegrationLink);

export default router;


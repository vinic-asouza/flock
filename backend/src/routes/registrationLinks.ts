import { Router } from 'express';
import {
  listRegistrationLinks,
  getRegistrationLink,
  createRegistrationLink,
  updateRegistrationLink,
  deactivateRegistrationLink,
  deleteRegistrationLink
} from '../controllers/registrationLinkController';
import authMiddleware from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('reader'));

router.get('/', listRegistrationLinks);
router.post('/', requireRole('editor'), createRegistrationLink);
router.patch('/:id/deactivate', requireRole('editor'), deactivateRegistrationLink);
router.get('/:id', getRegistrationLink);
router.put('/:id', requireRole('editor'), updateRegistrationLink);
router.delete('/:id', requireRole('editor'), deleteRegistrationLink);

export default router;


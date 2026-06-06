import { Router } from 'express';
import {
  validateRegistrationLink,
  createMemberViaPublicLink,
  listPublicRegistrationGroups,
} from '../controllers/publicRegistrationController';
import { validateIntegrationLink, createIntegrationMemberViaPublicLink } from '../controllers/publicIntegrationController';
import publicRegistrationAuth from '../middlewares/publicRegistrationAuth';
import publicIntegrationAuth from '../middlewares/publicIntegrationAuth';
import { publicPostLimiter } from '../middlewares/publicPostLimiter';

const router = Router();

router.get('/registration/:token/groups', publicRegistrationAuth, listPublicRegistrationGroups);
router.get('/registration/:token', publicRegistrationAuth, validateRegistrationLink);
router.post('/registration/:token', publicPostLimiter, publicRegistrationAuth, createMemberViaPublicLink);

router.get('/integration/:token', publicIntegrationAuth, validateIntegrationLink);
router.post('/integration/:token', publicPostLimiter, publicIntegrationAuth, createIntegrationMemberViaPublicLink);

export default router;

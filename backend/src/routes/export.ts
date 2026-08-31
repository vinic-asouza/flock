import { Router } from 'express';
import {
  exportMemberPDF,
  exportDashboardPDF,
  exportMembersList,
  exportMembersListCSV,
  exportIntegrationMemberPDF,
  exportIntegrationMembersList,
  exportGroupMembersList,
  exportGroupsList,
  exportCongregationsList,
  exportCongregationMembersList,
  exportMemberRegistrationFormPDF,
  exportIntegrationRegistrationFormPDF,
} from '../controllers/exportController';
import authMiddleware from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('reader'));

router.get('/members/registration-form/pdf', exportMemberRegistrationFormPDF);
router.get('/member/:id/pdf', exportMemberPDF);
router.get('/integration/registration-form/pdf', exportIntegrationRegistrationFormPDF);
router.get('/integration/:id/pdf', exportIntegrationMemberPDF);
router.get('/dashboard/pdf', exportDashboardPDF);
router.post('/members/list', exportMembersList);
router.post('/members/list/csv', exportMembersListCSV);
router.post('/group/members/list', exportGroupMembersList);
router.post('/integration/list', exportIntegrationMembersList);
router.post('/groups/list', exportGroupsList);
router.post('/congregations/list', exportCongregationsList);
router.post('/congregation/members/list', exportCongregationMembersList);

export default router;


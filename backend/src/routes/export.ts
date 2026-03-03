import { Router } from 'express';
import {
  exportMemberPDF,
  exportDashboardPDF,
  exportMembersList,
  exportMembersListCSV,
  exportIntegrationMemberPDF,
  exportIntegrationMembersList
} from '../controllers/exportController';
import authMiddleware from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('reader'));

router.get('/member/:id/pdf', exportMemberPDF);
router.get('/integration/:id/pdf', exportIntegrationMemberPDF);
router.get('/dashboard/pdf', exportDashboardPDF);
router.post('/members/list', exportMembersList);
router.post('/members/list/csv', exportMembersListCSV);
router.post('/integration/list', exportIntegrationMembersList);

export default router;


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

const router = Router();

// Exportar membro individual em PDF
router.get('/member/:id/pdf', authMiddleware, exportMemberPDF);

// Exportar integrante individual em PDF
router.get('/integration/:id/pdf', authMiddleware, exportIntegrationMemberPDF);

// Exportar dashboard em PDF
router.get('/dashboard/pdf', authMiddleware, exportDashboardPDF);

// Exportar lista de membros em PDF
router.post('/members/list', authMiddleware, exportMembersList);

// Exportar lista de membros em CSV
router.post('/members/list/csv', authMiddleware, exportMembersListCSV);

// Exportar lista de integrantes em PDF
router.post('/integration/list', authMiddleware, exportIntegrationMembersList);

export default router;


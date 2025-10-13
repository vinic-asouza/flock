import { Router } from 'express';
import { exportMemberPDF, exportDashboardPDF, exportMembersList } from '../controllers/exportController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Exportar membro individual em PDF
router.get('/member/:id/pdf', authMiddleware, exportMemberPDF);

// Exportar dashboard em PDF
router.get('/dashboard/pdf', authMiddleware, exportDashboardPDF);

// Exportar lista de membros em PDF
router.post('/members/list', authMiddleware, exportMembersList);

export default router;


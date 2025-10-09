import { Router } from 'express';
import { exportMemberPDF } from '../controllers/exportController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Exportar membro em PDF
router.get('/member/:id/pdf', authMiddleware, exportMemberPDF);

export default router;


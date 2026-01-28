import { Router } from 'express';
import {
  addParticipant,
  listParticipants,
  removeParticipant,
  addParticipantsBulk,
} from '../controllers/calendarParticipantController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas de participantes
router.post('/calendar-items/:calendarItemId/participants/bulk', addParticipantsBulk); // Bulk add deve vir antes da rota genérica
router.post('/calendar-items/:calendarItemId/participants', addParticipant);
router.get('/calendar-items/:calendarItemId/participants', listParticipants);
router.delete('/calendar-items/:calendarItemId/participants/:participantId', removeParticipant);

export default router;

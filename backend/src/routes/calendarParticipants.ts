import { Router } from 'express';
import {
  addParticipant,
  listParticipants,
  removeParticipant,
  addParticipantsBulk,
} from '../controllers/calendarParticipantController';
import authMiddleware from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('reader'));

router.post('/calendar-items/:calendarItemId/participants/bulk', requireRole('editor'), addParticipantsBulk);
router.post('/calendar-items/:calendarItemId/participants', requireRole('editor'), addParticipant);
router.get('/calendar-items/:calendarItemId/participants', listParticipants);
router.delete('/calendar-items/:calendarItemId/participants/:participantId', requireRole('editor'), removeParticipant);

export default router;

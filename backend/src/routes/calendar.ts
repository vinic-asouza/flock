import { Router } from 'express';
import {
  listCalendarItems,
  getCalendarItem,
  createCalendarItem,
  updateCalendarItem,
  deleteCalendarItem,
  exportCalendarPDF,
  listGroupsWithCalendarItems
} from '../controllers/calendarController';
import authMiddleware from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('reader'));

router.get('/', listCalendarItems);
router.get('/groups', listGroupsWithCalendarItems);
router.get('/export/pdf', exportCalendarPDF);
router.get('/:id', getCalendarItem);
router.post('/', requireRole('editor'), createCalendarItem);
router.put('/:id', requireRole('editor'), updateCalendarItem);
router.delete('/:id', requireRole('editor'), deleteCalendarItem);

export default router;

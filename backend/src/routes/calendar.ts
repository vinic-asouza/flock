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

const router = Router();

router.use(authMiddleware);

router.get('/', listCalendarItems);
router.get('/groups', listGroupsWithCalendarItems);
router.get('/:id', getCalendarItem);
router.post('/', createCalendarItem);
router.put('/:id', updateCalendarItem);
router.delete('/:id', deleteCalendarItem);
router.get('/export/pdf', exportCalendarPDF);

export default router;

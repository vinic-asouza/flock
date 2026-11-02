import { Router } from 'express';
import authMiddleware from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  replaceEventOrganizers,
} from '../controllers/eventController';
import {
  listEventRegistrations,
  createEventRegistration,
  resolveEventRegistration,
  deleteEventRegistration,
} from '../controllers/eventRegistrationController';
import {
  getEventPublicLink,
  createEventPublicLink,
  patchEventPublicLink,
} from '../controllers/eventPublicLinkController';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('reader'));

router.get('/', listEvents);
router.get('/:id', getEvent);
router.post('/', requireRole('editor'), createEvent);
router.patch('/:id', requireRole('editor'), updateEvent);
router.delete('/:id', requireRole('editor'), deleteEvent);
router.put('/:id/organizers', requireRole('editor'), replaceEventOrganizers);

router.get('/:id/registrations', listEventRegistrations);
router.post('/:id/registrations', requireRole('editor'), createEventRegistration);
router.patch(
  '/registrations/:id/resolve',
  requireRole('editor'),
  resolveEventRegistration
);
router.delete('/registrations/:id', requireRole('editor'), deleteEventRegistration);

router.get('/:id/public-link', getEventPublicLink);
router.post('/:id/public-link', requireRole('editor'), createEventPublicLink);
router.patch('/:id/public-link', requireRole('editor'), patchEventPublicLink);

export default router;

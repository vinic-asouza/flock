import { Router } from 'express';
import {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  addMemberToGroup,
  removeMemberFromGroup
} from '../controllers/groupController';
import authMiddleware from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('reader'));

router.get('/', listGroups);
router.get('/:id', getGroup);
router.get('/:id/members', getGroupMembers);
router.post('/', requireRole('editor'), createGroup);
router.put('/:id', requireRole('editor'), updateGroup);
router.delete('/:id', requireRole('editor'), deleteGroup);
router.post('/:id/members', requireRole('editor'), addMemberToGroup);
router.delete('/:id/members/:memberId', requireRole('editor'), removeMemberFromGroup);

export default router;

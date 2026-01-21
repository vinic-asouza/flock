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

const router = Router();

router.use(authMiddleware);

router.get('/', listGroups);
router.get('/:id', getGroup);
router.get('/:id/members', getGroupMembers);
router.post('/', createGroup);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);
router.post('/:id/members', addMemberToGroup);
router.delete('/:id/members/:memberId', removeMemberFromGroup);

export default router;

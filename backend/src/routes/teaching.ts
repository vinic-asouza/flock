import { Router } from 'express';
import authMiddleware from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';
import {
  listTeachingPrograms,
  getTeachingProgram,
  createTeachingProgram,
  updateTeachingProgram,
  deleteTeachingProgram,
} from '../controllers/teachingProgramController';
import {
  listTeachingClasses,
  getTeachingClass,
  createTeachingClass,
  updateTeachingClass,
  deleteTeachingClass,
  replaceTeachingClassTeachers,
} from '../controllers/teachingClassController';
import {
  listTeachingEnrollments,
  createTeachingEnrollment,
  resolveTeachingEnrollment,
  deleteTeachingEnrollment,
} from '../controllers/teachingEnrollmentController';
import {
  getTeachingPublicLink,
  createTeachingPublicLink,
  patchTeachingPublicLink,
} from '../controllers/teachingPublicLinkController';
import {
  listTeachingMaterials,
  createTeachingMaterial,
  updateTeachingMaterial,
  deleteTeachingMaterial,
} from '../controllers/teachingMaterialController';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('reader'));

// Programas
router.get('/programs', listTeachingPrograms);
router.get('/programs/:id', getTeachingProgram);
router.post('/programs', requireRole('editor'), createTeachingProgram);
router.patch('/programs/:id', requireRole('editor'), updateTeachingProgram);
router.delete('/programs/:id', requireRole('editor'), deleteTeachingProgram);

// Turmas
router.get('/classes', listTeachingClasses);
router.get('/classes/:id', getTeachingClass);
router.post('/classes', requireRole('editor'), createTeachingClass);
router.patch('/classes/:id', requireRole('editor'), updateTeachingClass);
router.delete('/classes/:id', requireRole('editor'), deleteTeachingClass);
router.put('/classes/:id/teachers', requireRole('editor'), replaceTeachingClassTeachers);

// Matrículas
router.get('/classes/:id/enrollments', listTeachingEnrollments);
router.post('/classes/:id/enrollments', requireRole('editor'), createTeachingEnrollment);
router.patch('/enrollments/:id/resolve', requireRole('editor'), resolveTeachingEnrollment);
router.delete('/enrollments/:id', requireRole('editor'), deleteTeachingEnrollment);

// Link público da turma
router.get('/classes/:id/public-link', getTeachingPublicLink);
router.post('/classes/:id/public-link', requireRole('editor'), createTeachingPublicLink);
router.patch('/classes/:id/public-link', requireRole('editor'), patchTeachingPublicLink);

// Materiais da turma
router.get('/classes/:id/materials', listTeachingMaterials);
router.post('/classes/:id/materials', requireRole('editor'), createTeachingMaterial);
router.patch('/materials/:materialId', requireRole('editor'), updateTeachingMaterial);
router.delete('/materials/:materialId', requireRole('editor'), deleteTeachingMaterial);

export default router;

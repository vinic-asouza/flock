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
  createTeachingLesson,
  createTeachingLessonSeries,
  deleteTeachingLesson,
  getTeachingLessonAttendance,
  listTeachingLessons,
  previewTeachingLessonSeries,
  saveTeachingLessonAttendance,
  updateTeachingLesson,
} from '../controllers/teachingLessonController';
import { exportTeachingCertificates } from '../controllers/teachingCertificateController';
import { uploadCertificateImages } from '../middlewares/uploadCertificateImages';

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

// Aulas, séries e chamada
router.get('/classes/:id/lessons', listTeachingLessons);
router.post('/classes/:id/lessons', requireRole('editor'), createTeachingLesson);
router.post(
  '/classes/:id/lesson-series/preview',
  requireRole('editor'),
  previewTeachingLessonSeries
);
router.post('/classes/:id/lesson-series', requireRole('editor'), createTeachingLessonSeries);
router.patch('/lessons/:lessonId', requireRole('editor'), updateTeachingLesson);
router.delete('/lessons/:lessonId', requireRole('editor'), deleteTeachingLesson);
router.get('/lessons/:lessonId/attendance', getTeachingLessonAttendance);
router.put(
  '/lessons/:lessonId/attendance',
  requireRole('editor'),
  saveTeachingLessonAttendance
);

// Matrículas
router.get('/classes/:id/enrollments', listTeachingEnrollments);
router.post('/classes/:id/enrollments', requireRole('editor'), createTeachingEnrollment);
router.patch('/enrollments/:id/resolve', requireRole('editor'), resolveTeachingEnrollment);
router.delete('/enrollments/:id', requireRole('editor'), deleteTeachingEnrollment);

// Link público da turma
router.get('/classes/:id/public-link', getTeachingPublicLink);
router.post('/classes/:id/public-link', requireRole('editor'), createTeachingPublicLink);
router.patch('/classes/:id/public-link', requireRole('editor'), patchTeachingPublicLink);

// Certificados (PDF efêmero — sem persistência)
router.post(
  '/classes/:id/certificates/export',
  requireRole('editor'),
  (req, res, next) => {
    uploadCertificateImages.fields([
      { name: 'churchLogo', maxCount: 1 },
      { name: 'extraLogos', maxCount: 2 },
    ])(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          error: 'Upload inválido',
          details: err instanceof Error ? err.message : 'Falha ao processar imagens',
        });
      }
      return next();
    });
  },
  exportTeachingCertificates
);

export default router;

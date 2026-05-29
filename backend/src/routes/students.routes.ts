import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { studentsController } from '../controllers/students.controller';
import { documentsController } from '../controllers/documents.controller';
import { createStudentSchema, updateStudentSchema } from '../schemas/student.schema';

const router = Router();
router.use(requireAuth);

router.get('/', requireRole('admin'), studentsController.list);

// Student self-lookup: returns the current user's own student record
router.get('/me', requireRole('student'), studentsController.getMe);

router.post('/:studentId/transcript', requireRole('admin'), documentsController.generateTranscript);
router.get('/:id', studentsController.get);
router.post('/', requireRole('admin'), validate(createStudentSchema), studentsController.create);
router.patch('/:id', requireRole('admin'), validate(updateStudentSchema), studentsController.update);

export default router;

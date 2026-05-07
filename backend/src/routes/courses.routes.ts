import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { coursesController } from '../controllers/courses.controller';
import { createCourseSchema, updateCourseSchema } from '../schemas/course.schema';

const router = Router();
router.use(requireAuth);

router.get('/', coursesController.list);
router.post('/', requireRole('admin'), validate(createCourseSchema), coursesController.create);
router.patch('/:id', requireRole('admin'), validate(updateCourseSchema), coursesController.update);

export default router;

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { facultiesController } from '../controllers/faculties.controller';
import {
  createFacultySchema,
  updateFacultySchema,
} from '../schemas/faculty.schema';

const router = Router();
router.use(requireAuth);

router.get('/', facultiesController.list);
router.post('/', requireRole('admin'), validate(createFacultySchema), facultiesController.create);
router.patch('/:id', requireRole('admin'), validate(updateFacultySchema), facultiesController.update);
router.delete('/:id', requireRole('admin'), facultiesController.remove);

export default router;

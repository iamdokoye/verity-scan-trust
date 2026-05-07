import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { departmentsController } from '../controllers/departments.controller';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from '../schemas/department.schema';

const router = Router();
router.use(requireAuth);

router.get('/', departmentsController.list);
router.post('/', requireRole('admin'), validate(createDepartmentSchema), departmentsController.create);
router.patch('/:id', requireRole('admin'), validate(updateDepartmentSchema), departmentsController.update);
router.delete('/:id', requireRole('admin'), departmentsController.remove);

export default router;

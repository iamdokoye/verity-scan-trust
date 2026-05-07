import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { resultsController } from '../controllers/results.controller';
import { bulkResultSchema, createResultSchema } from '../schemas/result.schema';

const router = Router();
router.use(requireAuth);

router.get('/students/:studentId', resultsController.listForStudent);
router.post('/', requireRole('admin'), validate(createResultSchema), resultsController.create);
router.post('/bulk', requireRole('admin'), validate(bulkResultSchema), resultsController.bulk);
router.patch('/:id/lock', requireRole('admin'), resultsController.lock);

export default router;

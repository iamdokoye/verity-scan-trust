import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { sessionsController } from '../controllers/sessions.controller';
import { createSessionSchema } from '../schemas/session.schema';

const router = Router();
router.use(requireAuth);

router.get('/', sessionsController.list);
router.post('/', requireRole('admin'), validate(createSessionSchema), sessionsController.create);

export default router;

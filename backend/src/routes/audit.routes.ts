import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { auditController } from '../controllers/audit.controller';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', auditController.list);

export default router;

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { superAdminController } from '../controllers/superadmin.controller';

const router = Router();

// All routes require super_admin role
router.use(requireAuth, requireRole('super_admin'));

router.get('/stats', superAdminController.getStats);

export default router;

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { institutionController } from '../controllers/institution.controller';
import {
  createInstitutionSchema,
  updateInstitutionSchema,
  provisionAdminSchema,
} from '../schemas/institution.schema';

const router = Router();

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/public-key', institutionController.publicKey);
router.get('/list', institutionController.listPublic); // used by signup page dropdown

// ── Institution admin: own institution ──────────────────────────────────────
router.get('/me', requireAuth, requireRole('admin'), institutionController.getMine);

// ── Super admin: institution management ─────────────────────────────────────
// NOTE: /all and / must be defined before /:id so Express doesn't treat
//       "all" as an id parameter.
router.get('/all', requireAuth, requireRole('super_admin'), institutionController.listAll);

router.post(
  '/',
  requireAuth,
  requireRole('super_admin'),
  validate(createInstitutionSchema),
  institutionController.create
);

router.get('/:id', requireAuth, requireRole('super_admin'), institutionController.getOne);

router.patch(
  '/:id',
  requireAuth,
  requireRole('super_admin'),
  validate(updateInstitutionSchema),
  institutionController.update
);

router.post(
  '/:id/admins',
  requireAuth,
  requireRole('super_admin'),
  validate(provisionAdminSchema),
  institutionController.provisionAdmin
);

router.patch(
  '/:id/suspend',
  requireAuth,
  requireRole('super_admin'),
  institutionController.suspend
);

router.patch(
  '/:id/reactivate',
  requireAuth,
  requireRole('super_admin'),
  institutionController.reactivate
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('super_admin'),
  institutionController.deleteInstitution
);

export default router;

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { transcriptRequestsController } from '../controllers/transcriptRequests.controller';
import {
  createTranscriptRequestSchema,
  decideTranscriptRequestSchema,
  listTranscriptRequestsSchema,
} from '../schemas/transcriptRequest.schema';

const router = Router();
router.use(requireAuth);

// Student
router.post(
  '/',
  requireRole('student'),
  validate(createTranscriptRequestSchema),
  transcriptRequestsController.create
);
router.get('/mine', requireRole('student'), transcriptRequestsController.listMine);

// Institution admin
router.get(
  '/',
  requireRole('admin'),
  validate(listTranscriptRequestsSchema, 'query'),
  transcriptRequestsController.list
);
router.post('/:id/approve', requireRole('admin'), transcriptRequestsController.approve);
router.post(
  '/:id/reject',
  requireRole('admin'),
  validate(decideTranscriptRequestSchema),
  transcriptRequestsController.reject
);

export default router;

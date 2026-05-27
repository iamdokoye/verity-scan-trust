import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import { documentsController } from '../controllers/documents.controller';
import {
  approveDocumentSchema,
  rejectDocumentSchema,
  revokeDocumentSchema,
  supersedeDocumentSchema,
  uploadDocumentSchema,
} from '../schemas/document.schema';

const router = Router();
router.use(requireAuth);

router.post(
  '/students/:studentId',
  requireRole('admin'),
  uploadMiddleware.single('file'),
  validate(uploadDocumentSchema),
  documentsController.uploadDocument
);

router.get('/students/:studentId', documentsController.getStudentDocuments);

router.post(
  '/students/:studentId/transcript',
  requireRole('admin'),
  documentsController.generateTranscript
);

router.patch(
  '/:documentId/approve',
  requireRole('admin'),
  validate(approveDocumentSchema),
  documentsController.approveDocument
);

router.patch(
  '/:documentId/reject',
  requireRole('admin'),
  validate(rejectDocumentSchema),
  documentsController.rejectDocument
);

router.post(
  '/:documentId/supersede',
  requireRole('admin'),
  uploadMiddleware.single('file'),
  validate(supersedeDocumentSchema),
  documentsController.supersedeDocument
);

router.patch(
  '/:documentId/revoke',
  requireRole('admin'),
  validate(revokeDocumentSchema),
  documentsController.revokeDocument
);

router.get('/:documentId/download', documentsController.getDownloadUrl);

// List all pending-approval documents for the institution (approval queue)
router.get('/pending', requireRole('admin'), documentsController.listPending);

export default router;

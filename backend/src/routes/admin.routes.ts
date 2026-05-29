import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { auditService } from '../services/audit.service';
import { NotFoundError } from '../utils/errors';

const router = Router();
router.use(requireAuth, requireRole('admin'));

/**
 * GET /api/v1/admin/stats
 * Returns institution-level stats for the admin dashboard.
 */
router.get('/stats', async (req, res, next) => {
  try {
    const institutionId = req.user!.institutionId!;

    const [
      totalStudents,
      totalDocuments,
      pendingDocuments,
      verifications,
    ] = await Promise.all([
      prisma.student.count({ where: { institutionId } }),
      prisma.document.count({ where: { institutionId } }),
      prisma.document.count({ where: { institutionId, status: 'pending_approval' } }),
      prisma.auditLog.count({
        where: {
          action: 'VERIFICATION_PERFORMED',
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    const recentActivity = await prisma.auditLog.findMany({
      where: { actor: { institutionId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { actor: { select: { fullName: true, email: true } } },
    });

    sendSuccess(res, {
      totalStudents,
      totalDocuments,
      pendingDocuments,
      verificationsToday: verifications,
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/tamper/:documentId
 *
 * Demo-only endpoint. Corrupts the stored sha256Hash for an approved document
 * so that the next verification call returns { status: "tampered" }.
 *
 * Flow:
 *   1. Upload + approve a document → /verify?token=X returns "verified"
 *   2. Call this endpoint          → corrupts stored hash in DB
 *   3. Re-verify same token        → /verify?token=X now returns "tampered"
 *
 * Remove or gate behind an env flag in production.
 */
router.patch('/tamper/:documentId', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true') {
    return res.status(404).json({ success: false, error: { message: 'Not found', code: 'NOT_FOUND' } });
  }
  try {
    const document = await prisma.document.findFirst({
      where: {
        id:            req.params.documentId,
        institutionId: req.user!.institutionId,
        status:        'approved',
      },
    });

    if (!document) throw new NotFoundError('Approved document');
    if (!document.sha256Hash) {
      return sendError(res, 'Document has no stored hash', 400, 'NO_HASH');
    }

    // Flip the first 8 hex chars to "deadbeef" — guaranteed to mismatch
    const corruptedHash = 'deadbeef' + document.sha256Hash.slice(8);

    await prisma.document.update({
      where: { id: document.id },
      data:  { sha256Hash: corruptedHash },
    });

    await auditService.log({
      actorId:    req.user!.id,
      actorRole:  req.user!.role,
      action:     'VERIFICATION_PERFORMED',
      severity:   'critical',
      targetType: 'Document',
      targetId:   document.id,
      ipAddress:  req.ip,
      metadata:   { demoTamper: true, originalHash: document.sha256Hash },
    });

    sendSuccess(res, {
      message: 'Document hash corrupted for tamper simulation.',
      documentId: document.id,
      hint: `Re-verify with token to see status: "tampered"`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

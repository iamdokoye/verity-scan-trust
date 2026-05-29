import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { documentService } from '../services/document.service';
import { storageService } from '../services/storage.service';
import { transcriptService } from '../services/transcript.service';
import { cryptoService } from '../services/crypto.service';
import { auditService } from '../services/audit.service';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { sendSuccess, sendError } from '../utils/response';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { DocumentType } from '@prisma/client';

export const documentsController = {
  async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return sendError(res, 'No file uploaded', 400, 'NO_FILE');

      const document = await documentService.uploadDocument({
        studentId: req.params.studentId,
        institutionId: req.user!.institutionId!,
        uploadedBy: req.user!.id,
        uploaderRole: req.user!.role,
        documentType: req.body.documentType as DocumentType,
        file: req.file,
        declaredDegreeClass: req.body.declaredDegreeClass,
        declaredProgramme: req.body.declaredProgramme,
        declaredGraduationYear: req.body.declaredGraduationYear
          ? parseInt(req.body.declaredGraduationYear, 10)
          : undefined,
        ipAddress: req.ip,
      });

      sendSuccess(res, document, 201);
    } catch (err) {
      next(err);
    }
  },

  async getStudentDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      const user = req.user!;

      if (user.role === 'student') {
        const student = await prisma.student.findFirst({
          where: { id: studentId, profileId: user.id },
        });
        if (!student) throw new ForbiddenError();
      }

      const documents = await prisma.document.findMany({
        where: { studentId, institutionId: user.institutionId! },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          documentType: true,
          status: true,
          fileName: true,
          fileSizeBytes: true,
          mimeType: true,
          sha256Hash: true,
          signedAt: true,
          createdAt: true,
          verificationToken: true,
          qrCodeBase64: true,
          approvalNote: true,
          supersessionReason: true,
          revocationReason: true,
        },
      });

      sendSuccess(res, documents);
    } catch (err) {
      next(err);
    }
  },

  async approveDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await documentService.approveDocument({
        documentId: req.params.documentId,
        approverId: req.user!.id,
        approverRole: req.user!.role,
        approverInstitutionId: req.user!.institutionId!,
        approvalNote: req.body.approvalNote,
        ipAddress: req.ip,
      });
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },

  async rejectDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await documentService.rejectDocument({
        documentId: req.params.documentId,
        rejectorId: req.user!.id,
        rejectorRole: req.user!.role,
        rejectorInstitutionId: req.user!.institutionId!,
        rejectionReason: req.body.rejectionReason,
        ipAddress: req.ip,
      });
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },

  async supersedeDocument(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return sendError(res, 'No replacement file uploaded', 400, 'NO_FILE');
      const result = await documentService.supersedeDocument({
        originalDocumentId: req.params.documentId,
        newFile: req.file,
        supersessionReason: req.body.supersessionReason,
        requestorId: req.user!.id,
        requestorRole: req.user!.role,
        institutionId: req.user!.institutionId!,
        ipAddress: req.ip,
      });
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async revokeDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await documentService.revokeDocument({
        documentId: req.params.documentId,
        revokerId: req.user!.id,
        revokerRole: req.user!.role,
        institutionId: req.user!.institutionId!,
        revocationReason: req.body.revocationReason,
        ipAddress: req.ip,
      });
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },

  async getDownloadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const document = await prisma.document.findFirst({
        where: { id: req.params.documentId, institutionId: req.user!.institutionId! },
      });
      if (!document) throw new NotFoundError('Document');

      if (req.user!.role === 'student') {
        const student = await prisma.student.findFirst({
          where: { id: document.studentId, profileId: req.user!.id },
        });
        if (!student) throw new ForbiddenError();
      }

      const signedUrl = await storageService.getSignedUrl(document.filePath);
      sendSuccess(res, { url: signedUrl, expiresIn: 300 });
    } catch (err) {
      next(err);
    }
  },

  async generateTranscript(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      const user = req.user!;
      const institutionId = user.institutionId!;

      const buffer = await transcriptService.generateTranscriptPdf(studentId);
      const hash = cryptoService.hashFile(buffer);

      const duplicate = await prisma.document.findFirst({
        where: { sha256Hash: hash, studentId },
      });

      if (duplicate) {
        return sendError(
          res,
          'An identical transcript already exists for this student.',
          409,
          'DUPLICATE_TRANSCRIPT'
        );
      }

      const documentId = crypto.randomUUID();
      const filePath = await storageService.uploadFile(
        institutionId,
        studentId,
        documentId,
        'transcript.pdf',
        buffer,
        'application/pdf'
      );
      const signature = cryptoService.signHash(hash);
      const verificationToken = cryptoService.generateVerificationToken();
      const qrCodeBase64 = await cryptoService.generateQRCode(
        `${env.FRONTEND_URL}/verify?token=${verificationToken}`
      );

      const document = await prisma.document.create({
        data: {
          id: documentId,
          studentId,
          institutionId,
          uploadedBy: user.id,
          approvedBy: user.id,
          documentType: 'transcript',
          status: 'approved',
          filePath,
          fileName: 'transcript.pdf',
          fileSizeBytes: buffer.length,
          mimeType: 'application/pdf',
          sha256Hash: hash,
          signature,
          signedAt: new Date(),
          verificationToken,
          qrCodeBase64,
        },
      });

      await prisma.result.updateMany({
        where: { studentId, isLocked: false },
        data: { isLocked: true, lockedAt: new Date() },
      });

      await auditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'TRANSCRIPT_GENERATED',
        severity: 'info',
        targetType: 'Document',
        targetId: documentId,
        ipAddress: req.ip,
      });

      sendSuccess(res, document, 201);
    } catch (err) {
      next(err);
    }
  },

  async listPending(req: Request, res: Response, next: NextFunction) {
    try {
      const page     = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
      const pageSize = Math.min(50, parseInt((req.query.pageSize as string) ?? '20', 10));

      const [items, total] = await Promise.all([
        prisma.document.findMany({
          where:   { institutionId: req.user!.institutionId!, status: 'pending_approval' },
          orderBy: { createdAt: 'asc' },
          skip:    (page - 1) * pageSize,
          take:    pageSize,
          include: {
            student:  { select: { fullName: true, matricNumber: true } },
            uploader: { select: { fullName: true, email: true } },
          },
        }),
        prisma.document.count({
          where: { institutionId: req.user!.institutionId!, status: 'pending_approval' },
        }),
      ]);

      sendSuccess(res, items, 200, { total, page, pageSize });
    } catch (err) {
      next(err);
    }
  },
};

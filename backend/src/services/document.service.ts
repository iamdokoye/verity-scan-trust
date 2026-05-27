import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { cryptoService } from './crypto.service';
import { storageService } from './storage.service';
import { crossValidationService } from './crossValidation.service';
import { auditService } from './audit.service';
import { ConflictError, NotFoundError, SecurityError } from '../utils/errors';
import { DocumentType } from '@prisma/client';
import { env } from '../config/env';

export class DocumentService {
  async uploadDocument(params: {
    studentId: string;
    institutionId: string;
    uploadedBy: string;
    uploaderRole: string;
    documentType: DocumentType;
    file: Express.Multer.File;
    declaredDegreeClass?: string;
    declaredProgramme?: string;
    declaredGraduationYear?: number;
    ipAddress?: string;
  }) {
    const {
      studentId,
      institutionId,
      uploadedBy,
      uploaderRole,
      documentType,
      file,
      ipAddress,
      declaredDegreeClass,
      declaredProgramme,
      declaredGraduationYear,
    } = params;

    // Step 1: hash
    const fileHash = cryptoService.hashFile(file.buffer);

    // Step 2: same-student duplicate
    const sameDuplicate = await prisma.document.findFirst({
      where: {
        sha256Hash: fileHash,
        studentId,
        status: { notIn: ['superseded', 'revoked'] },
      },
    });

    if (sameDuplicate) {
      await auditService.log({
        actorId: uploadedBy,
        actorRole: uploaderRole,
        action: 'DUPLICATE_HASH_DETECTED',
        severity: 'warning',
        targetType: 'Document',
        targetId: sameDuplicate.id,
        ipAddress,
        metadata: { hash: fileHash, studentId },
      });
      throw new ConflictError(
        'This exact document has already been uploaded for this student.'
      );
    }

    // Step 3: cross-student duplicate
    const crossDuplicate = await prisma.document.findFirst({
      where: {
        sha256Hash: fileHash,
        studentId: { not: studentId },
        status: { notIn: ['superseded', 'revoked'] },
      },
    });

    if (crossDuplicate) {
      await auditService.log({
        actorId: uploadedBy,
        actorRole: uploaderRole,
        action: 'CROSS_STUDENT_DUPLICATE',
        severity: 'critical',
        targetType: 'Document',
        targetId: crossDuplicate.id,
        ipAddress,
        metadata: {
          hash: fileHash,
          attemptedStudentId: studentId,
          existingStudentId: crossDuplicate.studentId,
        },
      });
      throw new SecurityError(
        'SECURITY ALERT: This document file is already associated with a different ' +
          'student record. Upload rejected and logged.'
      );
    }

    // Step 4: cross-validate metadata
    if (documentType === 'degree_certificate') {
      try {
        await crossValidationService.validateCertificate(
          studentId,
          declaredDegreeClass,
          declaredProgramme,
          declaredGraduationYear
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Validation failed';
        await auditService.log({
          actorId: uploadedBy,
          actorRole: uploaderRole,
          action: 'CERTIFICATE_MISMATCH',
          severity: 'critical',
          targetType: 'Student',
          targetId: studentId,
          ipAddress,
          metadata: {
            declaredDegreeClass,
            declaredProgramme,
            declaredGraduationYear,
            error: message,
          },
        });
        throw err;
      }
    }

    // Step 5: store file
    const documentId = crypto.randomUUID();
    const filePath = await storageService.uploadFile(
      institutionId,
      studentId,
      documentId,
      file.originalname,
      file.buffer,
      file.mimetype
    );

    // Step 6: create record
    const document = await prisma.document.create({
      data: {
        id: documentId,
        studentId,
        institutionId,
        uploadedBy,
        documentType,
        status: 'pending_approval',
        filePath,
        fileName: file.originalname,
        fileSizeBytes: file.size,
        mimeType: file.mimetype,
        sha256Hash: fileHash,
        declaredDegreeClass,
        declaredProgramme,
        declaredGraduationYear,
      },
    });

    await auditService.log({
      actorId: uploadedBy,
      actorRole: uploaderRole,
      action: 'DOCUMENT_UPLOADED',
      severity: 'info',
      targetType: 'Document',
      targetId: document.id,
      ipAddress,
      metadata: { documentType, fileName: file.originalname },
    });

    return document;
  }

  async approveDocument(params: {
    documentId: string;
    approverId: string;
    approverRole: string;
    approverInstitutionId: string;
    approvalNote?: string;
    ipAddress?: string;
  }) {
    const {
      documentId,
      approverId,
      approverRole,
      approverInstitutionId,
      approvalNote,
      ipAddress,
    } = params;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        institutionId: approverInstitutionId,
        status: 'pending_approval',
      },
    });

    if (!document) throw new NotFoundError('Document pending approval');
    if (!document.sha256Hash) throw new SecurityError('Document is missing hash');

    const signature = cryptoService.signHash(document.sha256Hash);
    const verificationToken = cryptoService.generateVerificationToken();
    const verificationUrl = `${env.FRONTEND_URL}/verify?token=${verificationToken}`;
    const qrCodeBase64 = await cryptoService.generateQRCode(verificationUrl);

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'approved',
        approvedBy: approverId,
        signature,
        signedAt: new Date(),
        verificationToken,
        qrCodeBase64,
        approvalNote,
      },
    });

    await auditService.log({
      actorId: approverId,
      actorRole: approverRole,
      action: 'DOCUMENT_APPROVED',
      severity: 'info',
      targetType: 'Document',
      targetId: documentId,
      ipAddress,
      metadata: { approvalNote },
    });

    return updated;
  }

  async rejectDocument(params: {
    documentId: string;
    rejectorId: string;
    rejectorRole: string;
    rejectorInstitutionId: string;
    rejectionReason: string;
    ipAddress?: string;
  }) {
    const {
      documentId,
      rejectorId,
      rejectorRole,
      rejectorInstitutionId,
      rejectionReason,
      ipAddress,
    } = params;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        institutionId: rejectorInstitutionId,
        status: 'pending_approval',
      },
    });

    if (!document) throw new NotFoundError('Document pending approval');

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'rejected',
        approvalNote: rejectionReason,
        rejectedAt: new Date(),
      },
    });

    await auditService.log({
      actorId: rejectorId,
      actorRole: rejectorRole,
      action: 'DOCUMENT_REJECTED',
      severity: 'warning',
      targetType: 'Document',
      targetId: documentId,
      ipAddress,
      metadata: { rejectionReason },
    });

    return updated;
  }

  async supersedeDocument(params: {
    originalDocumentId: string;
    newFile: Express.Multer.File;
    supersessionReason: string;
    requestorId: string;
    requestorRole: string;
    institutionId: string;
    ipAddress?: string;
  }) {
    const {
      originalDocumentId,
      newFile,
      supersessionReason,
      requestorId,
      requestorRole,
      institutionId,
      ipAddress,
    } = params;

    const original = await prisma.document.findFirst({
      where: { id: originalDocumentId, institutionId, status: 'approved' },
    });

    if (!original) throw new NotFoundError('Approved document to supersede');

    const newDocumentId = crypto.randomUUID();
    const newHash = cryptoService.hashFile(newFile.buffer);
    const newFilePath = await storageService.uploadFile(
      institutionId,
      original.studentId,
      newDocumentId,
      newFile.originalname,
      newFile.buffer,
      newFile.mimetype
    );

    const newSignature = cryptoService.signHash(newHash);
    const newToken = cryptoService.generateVerificationToken();
    const verificationUrl = `${env.FRONTEND_URL}/verify?token=${newToken}`;
    const newQR = await cryptoService.generateQRCode(verificationUrl);

    await prisma.$transaction([
      prisma.document.update({
        where: { id: originalDocumentId },
        data: {
          status: 'superseded',
          supersededBy: newDocumentId,
          supersessionReason,
          supersededAt: new Date(),
        },
      }),
      prisma.document.create({
        data: {
          id: newDocumentId,
          studentId: original.studentId,
          institutionId,
          uploadedBy: requestorId,
          approvedBy: requestorId,
          documentType: original.documentType,
          status: 'approved',
          filePath: newFilePath,
          fileName: newFile.originalname,
          fileSizeBytes: newFile.size,
          mimeType: newFile.mimetype,
          sha256Hash: newHash,
          signature: newSignature,
          signedAt: new Date(),
          verificationToken: newToken,
          qrCodeBase64: newQR,
        },
      }),
    ]);

    await auditService.log({
      actorId: requestorId,
      actorRole: requestorRole,
      action: 'DOCUMENT_SUPERSEDED',
      severity: 'critical',
      targetType: 'Document',
      targetId: originalDocumentId,
      ipAddress,
      metadata: { originalDocumentId, newDocumentId, supersessionReason },
    });

    return { originalDocumentId, newDocumentId, verificationToken: newToken };
  }

  async revokeDocument(params: {
    documentId: string;
    revokerId: string;
    revokerRole: string;
    institutionId: string;
    revocationReason: string;
    ipAddress?: string;
  }) {
    const {
      documentId,
      revokerId,
      revokerRole,
      institutionId,
      revocationReason,
      ipAddress,
    } = params;

    const document = await prisma.document.findFirst({
      where: { id: documentId, institutionId, status: 'approved' },
    });

    if (!document) throw new NotFoundError('Approved document');

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'revoked',
        revokedBy: revokerId,
        revocationReason,
        revokedAt: new Date(),
      },
    });

    await auditService.log({
      actorId: revokerId,
      actorRole: revokerRole,
      action: 'DOCUMENT_REVOKED',
      severity: 'critical',
      targetType: 'Document',
      targetId: documentId,
      ipAddress,
      metadata: { revocationReason },
    });

    return updated;
  }
}

export const documentService = new DocumentService();

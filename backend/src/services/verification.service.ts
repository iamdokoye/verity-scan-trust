import { prisma } from '../config/prisma';
import { storageService } from './storage.service';
import { cryptoService } from './crypto.service';
import { auditService } from './audit.service';
import { VerificationStatus } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

const PREVIEWABLE_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export class VerificationService {
  async verifyByToken(params: {
    token: string;
    verifierIp: string;
    method: 'qr' | 'token';
    verifierOrg?: string;
  }) {
    const { token, verifierIp, method, verifierOrg } = params;

    const document = await prisma.document.findUnique({
      where: { verificationToken: token },
      include: {
        student: {
          select: {
            fullName: true,
            matricNumber: true,
            programme: true,
            admissionYear: true,
            graduationYear: true,
          },
        },
        institution: {
          select: { name: true, acronym: true, publicKeyPem: true },
        },
      },
    });

    if (!document) {
      await this.logVerification({
        token,
        verifierIp,
        method,
        verifierOrg,
        status: 'not_found',
        failureReason: 'Token does not match any document',
      });
      return { status: 'not_found', message: 'No document found for this token.' };
    }

    if (document.status === 'superseded') {
      await this.logVerification({
        documentId: document.id,
        token,
        verifierIp,
        method,
        verifierOrg,
        status: 'superseded',
        failureReason: document.supersessionReason ?? undefined,
      });
      return {
        status: 'superseded',
        message: 'This document has been superseded by a corrected version.',
        reason: document.supersessionReason,
        supersededAt: document.supersededAt,
        documentType: document.documentType,
        studentName: document.student.fullName,
        institution: document.institution.name,
        ...this.previewInfo(document),
      };
    }

    if (document.status === 'revoked') {
      await this.logVerification({
        documentId: document.id,
        token,
        verifierIp,
        method,
        verifierOrg,
        status: 'revoked',
        failureReason: document.revocationReason ?? undefined,
      });
      return {
        status: 'revoked',
        message: 'This document has been revoked by the issuing institution.',
        reason: document.revocationReason,
        revokedAt: document.revokedAt,
        ...this.previewInfo(document),
      };
    }

    if (document.status !== 'approved') {
      await this.logVerification({
        documentId: document.id,
        token,
        verifierIp,
        method,
        verifierOrg,
        status: 'not_found',
        failureReason: 'Document is not approved',
      });
      return { status: 'not_found', message: 'Document is not available for verification.' };
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await storageService.downloadFile(document.filePath);
    } catch {
      await this.logVerification({
        documentId: document.id,
        token,
        verifierIp,
        method,
        verifierOrg,
        status: 'tampered',
        failureReason: 'Document file could not be retrieved from storage',
      });
      return {
        status: 'tampered',
        message: 'Document integrity check failed. File could not be retrieved.',
        previewAvailable: false,
        previewUnavailableReason: 'file_missing',
      };
    }

    const recomputedHash = cryptoService.hashFile(fileBuffer);

    if (recomputedHash !== document.sha256Hash) {
      await this.logVerification({
        documentId: document.id,
        token,
        verifierIp,
        method,
        verifierOrg,
        status: 'tampered',
        failureReason: 'File hash mismatch — content altered since upload',
      });
      return {
        status: 'tampered',
        message:
          'Document integrity compromised. The file content has been altered since issuance.',
        ...this.previewInfo(document),
      };
    }

    const signatureValid = cryptoService.verifySignature(recomputedHash, document.signature!);

    if (!signatureValid) {
      await this.logVerification({
        documentId: document.id,
        token,
        verifierIp,
        method,
        verifierOrg,
        status: 'invalid_signature',
        failureReason: 'Digital signature verification failed',
      });
      return {
        status: 'invalid_signature',
        message:
          'Document signature is invalid. This document was not issued by the claimed institution.',
        ...this.previewInfo(document),
      };
    }

    await this.logVerification({
      documentId: document.id,
      token,
      verifierIp,
      method,
      verifierOrg,
      status: 'verified',
    });

    return {
      status: 'verified',
      message: 'Document integrity confirmed. This document has not been altered since issuance.',
      documentType: document.documentType,
      studentName: document.student.fullName,
      matricNumber: document.student.matricNumber,
      programme: document.student.programme,
      institution: document.institution.name,
      sha256Hash: document.sha256Hash,
      signedAt: document.signedAt,
      verifiedAt: new Date().toISOString(),
      ...this.previewInfo(document),
    };
  }

  /** Whether the stored file can be shown to a verifier, and its type. */
  private previewInfo(document: { mimeType: string }) {
    return PREVIEWABLE_MIME_TYPES.includes(document.mimeType)
      ? { previewAvailable: true, fileMimeType: document.mimeType }
      : { previewAvailable: false };
  }

  /**
   * The stored file behind a verification token, for display on the public
   * result page. Only documents that have been issued are returned (approved,
   * revoked or superseded), and only for file types a browser can render.
   */
  async getPreview(token: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const document = await prisma.document.findUnique({
      where: { verificationToken: token },
      select: { filePath: true, mimeType: true, status: true },
    });

    if (
      !document ||
      !['approved', 'revoked', 'superseded'].includes(document.status) ||
      !PREVIEWABLE_MIME_TYPES.includes(document.mimeType)
    ) {
      throw new NotFoundError('Document preview');
    }

    const buffer = await storageService.downloadFile(document.filePath);
    return { buffer, mimeType: document.mimeType };
  }

  private async logVerification(params: {
    documentId?: string;
    token: string;
    verifierIp: string;
    method: string;
    verifierOrg?: string;
    status: VerificationStatus | string;
    failureReason?: string;
  }) {
    const verificationLog = prisma.verificationLog.create({
      data: {
        documentId: params.documentId,
        tokenUsed: params.token,
        verifierIp: params.verifierIp,
        verifierOrg: params.verifierOrg,
        method: params.method,
        status: params.status as VerificationStatus,
        failureReason: params.failureReason,
      },
    });

    if (params.documentId) {
      await Promise.all([
        verificationLog,
        auditService.log({
        action: 'VERIFICATION_PERFORMED',
        severity: params.status === 'verified' ? 'info' : 'warning',
        targetType: 'Document',
        targetId: params.documentId,
        ipAddress: params.verifierIp,
        metadata: {
          status: params.status,
          method: params.method,
          failureReason: params.failureReason,
        },
        }),
      ]);
      return;
    }

    await verificationLog;
  }
}

export const verificationService = new VerificationService();

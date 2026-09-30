import { Prisma, TranscriptRequestStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { auditService } from './audit.service';
import { gpaService } from './gpa.service';
import { transcriptService } from './transcript.service';
import { AppError, ConflictError, NotFoundError } from '../utils/errors';

type Actor = { id: string; role: string; institutionId?: string | null };

const studentSummary = { select: { fullName: true, matricNumber: true } } as const;

export class TranscriptRequestService {
  /** A student asks their registry for a signed transcript. */
  async create(user: Actor, note: string | undefined, ipAddress?: string) {
    const student = await prisma.student.findFirst({
      where: { profileId: user.id, institutionId: user.institutionId ?? undefined },
      select: { id: true, institutionId: true },
    });
    if (!student) throw new NotFoundError('Student record');

    const summary = await gpaService.getAcademicSummary(student.id);
    if (summary.totalResults === 0) {
      throw new AppError(
        'You have no recorded results yet, so there is nothing to put in a transcript.',
        400,
        'NO_RESULTS'
      );
    }

    let request;
    try {
      request = await prisma.transcriptRequest.create({
        data: {
          studentId: student.id,
          institutionId: student.institutionId,
          studentNote: note || null,
        },
      });
    } catch (err) {
      // The database allows only one pending request per student.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError('You already have a transcript request awaiting review.');
      }
      throw err;
    }

    await auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'TRANSCRIPT_REQUESTED',
      severity: 'info',
      targetType: 'TranscriptRequest',
      targetId: request.id,
      ipAddress,
    });
    return request;
  }

  /** The signed-in student's own requests, newest first. */
  async listMine(user: Actor) {
    const student = await prisma.student.findFirst({
      where: { profileId: user.id, institutionId: user.institutionId ?? undefined },
      select: { id: true },
    });
    if (!student) throw new NotFoundError('Student record');
    return prisma.transcriptRequest.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  /** Requests for the admin's institution (oldest pending first). */
  async listForInstitution(institutionId: string, status?: TranscriptRequestStatus) {
    return prisma.transcriptRequest.findMany({
      where: { institutionId, ...(status ? { status } : {}) },
      orderBy: status === 'pending' || !status ? { createdAt: 'asc' } : { updatedAt: 'desc' },
      take: 100,
      include: { student: studentSummary },
    });
  }

  /** Approving issues the transcript and links it to the request. */
  async approve(id: string, admin: Actor, ipAddress?: string) {
    const institutionId = admin.institutionId!;

    // Claim the request first so two admins (or a double click) can't issue
    // two transcripts for it.
    const claimed = await prisma.transcriptRequest.updateMany({
      where: { id, institutionId, status: 'pending' },
      data: { status: 'approved', decidedBy: admin.id, decidedAt: new Date() },
    });
    if (claimed.count === 0) await this.throwNotActionable(id, institutionId);

    const request = await prisma.transcriptRequest.findUniqueOrThrow({ where: { id } });

    try {
      let documentId: string;
      try {
        const document = await transcriptService.issueTranscript({
          studentId: request.studentId,
          institutionId,
          actor: { id: admin.id, role: admin.role },
          ipAddress,
        });
        documentId = document.id;
      } catch (err) {
        // Nothing has changed since an earlier transcript was issued, so the
        // student already has the right document. Link to it instead.
        if (!(err instanceof AppError) || err.code !== 'DUPLICATE_TRANSCRIPT') throw err;
        const existing = await prisma.document.findFirst({
          where: {
            studentId: request.studentId,
            institutionId,
            documentType: 'transcript',
            status: 'approved',
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (!existing) throw err;
        documentId = existing.id;
      }

      const updated = await prisma.transcriptRequest.update({
        where: { id },
        data: { documentId },
      });
      await auditService.log({
        actorId: admin.id,
        actorRole: admin.role,
        action: 'TRANSCRIPT_REQUEST_APPROVED',
        severity: 'info',
        targetType: 'TranscriptRequest',
        targetId: id,
        ipAddress,
        metadata: { documentId },
      });
      return updated;
    } catch (err) {
      // Issuing failed: put the request back so it can be retried.
      await prisma.transcriptRequest.update({
        where: { id },
        data: { status: 'pending', decidedBy: null, decidedAt: null },
      });
      throw err;
    }
  }

  async reject(id: string, admin: Actor, note: string | undefined, ipAddress?: string) {
    const institutionId = admin.institutionId!;
    const result = await prisma.transcriptRequest.updateMany({
      where: { id, institutionId, status: 'pending' },
      data: {
        status: 'rejected',
        decidedBy: admin.id,
        decidedAt: new Date(),
        decisionNote: note || null,
      },
    });
    if (result.count === 0) await this.throwNotActionable(id, institutionId);

    await auditService.log({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'TRANSCRIPT_REQUEST_REJECTED',
      severity: 'info',
      targetType: 'TranscriptRequest',
      targetId: id,
      ipAddress,
    });
    return prisma.transcriptRequest.findUniqueOrThrow({ where: { id } });
  }

  private async throwNotActionable(id: string, institutionId: string): Promise<never> {
    const existing = await prisma.transcriptRequest.findFirst({
      where: { id, institutionId },
      select: { status: true },
    });
    if (!existing) throw new NotFoundError('Transcript request');
    throw new ConflictError(`This request has already been ${existing.status}.`);
  }
}

export const transcriptRequestService = new TranscriptRequestService();

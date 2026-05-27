import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { auditService } from '../services/audit.service';
import { gpaService } from '../services/gpa.service';
import { gradeToPoint } from '../schemas/result.schema';

export const resultsController = {
  async listForStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const student = await prisma.student.findFirst({
        where: { id: req.params.studentId, institutionId: user.institutionId! },
      });
      if (!student) throw new NotFoundError('Student');
      if (user.role === 'student' && student.profileId !== user.id) {
        throw new ForbiddenError();
      }

      const summary = await gpaService.getAcademicSummary(student.id);
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, sessionId, courseId, grade } = req.body;
      const gradePoint = gradeToPoint(grade);

      const result = await prisma.result.upsert({
        where: { studentId_sessionId_courseId: { studentId, sessionId, courseId } },
        update: { grade, gradePoint, uploadedBy: req.user!.id },
        create: { studentId, sessionId, courseId, grade, gradePoint, uploadedBy: req.user!.id },
      });

      await auditService.log({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'RESULT_CREATED',
        targetType: 'Result',
        targetId: result.id,
        ipAddress: req.ip,
        metadata: { studentId, courseId, grade },
      });

      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  },

  async bulk(req: Request, res: Response, next: NextFunction) {
    try {
      const { results } = req.body as {
        results: Array<{ studentId: string; sessionId: string; courseId: string; grade: 'A'|'B'|'C'|'D'|'E'|'F' }>;
      };

      const ops = results.map((r) =>
        prisma.result.upsert({
          where: {
            studentId_sessionId_courseId: {
              studentId: r.studentId,
              sessionId: r.sessionId,
              courseId: r.courseId,
            },
          },
          update: { grade: r.grade, gradePoint: gradeToPoint(r.grade), uploadedBy: req.user!.id },
          create: {
            studentId: r.studentId,
            sessionId: r.sessionId,
            courseId: r.courseId,
            grade: r.grade,
            gradePoint: gradeToPoint(r.grade),
            uploadedBy: req.user!.id,
          },
        })
      );

      const created = await prisma.$transaction(ops);

      await auditService.log({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'RESULT_CREATED',
        targetType: 'Result',
        ipAddress: req.ip,
        metadata: { bulkCount: created.length },
      });

      sendSuccess(res, { count: created.length }, 201);
    } catch (err) {
      next(err);
    }
  },

  async lock(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await prisma.result.findUnique({
        where: { id: req.params.id },
        include: { student: true },
      });
      if (!result || result.student.institutionId !== req.user!.institutionId!) {
        throw new NotFoundError('Result');
      }
      const updated = await prisma.result.update({
        where: { id: req.params.id },
        data: { isLocked: true, lockedAt: new Date() },
      });
      await auditService.log({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'RESULT_LOCKED',
        targetType: 'Result',
        targetId: updated.id,
        ipAddress: req.ip,
      });
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },
};

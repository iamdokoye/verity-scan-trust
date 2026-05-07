import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { auditService } from '../services/audit.service';
import { gpaService } from '../services/gpa.service';

export const studentsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string | undefined)?.trim();
      const items = await prisma.student.findMany({
        where: {
          institutionId: req.user!.institutionId,
          ...(q && {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { matricNumber: { contains: q, mode: 'insensitive' } },
            ],
          }),
        },
        include: { department: { select: { name: true } } },
        orderBy: { matricNumber: 'asc' },
        take: 200,
      });
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const student = await prisma.student.findFirst({
        where: { id: req.params.id, institutionId: user.institutionId },
        include: { department: true, institution: { select: { name: true, acronym: true } } },
      });
      if (!student) throw new NotFoundError('Student');
      if (user.role === 'student' && student.profileId !== user.id) {
        throw new ForbiddenError();
      }
      const cgpa = await gpaService.computeCGPA(student.id);
      sendSuccess(res, {
        ...student,
        cgpa,
        degreeClass: gpaService.computeDegreeClass(cgpa),
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const student = await prisma.student.create({
        data: {
          ...req.body,
          institutionId: req.user!.institutionId,
          createdBy: req.user!.id,
        },
      });
      await auditService.log({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'STUDENT_CREATED',
        targetType: 'Student',
        targetId: student.id,
        ipAddress: req.ip,
      });
      sendSuccess(res, student, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.student.findFirst({
        where: { id: req.params.id, institutionId: req.user!.institutionId },
      });
      if (!existing) throw new NotFoundError('Student');
      const student = await prisma.student.update({
        where: { id: req.params.id },
        data: req.body,
      });
      await auditService.log({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'STUDENT_UPDATED',
        targetType: 'Student',
        targetId: student.id,
        ipAddress: req.ip,
      });
      sendSuccess(res, student);
    } catch (err) {
      next(err);
    }
  },
};

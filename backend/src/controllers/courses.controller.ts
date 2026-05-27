import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';

export const coursesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const departmentId = req.query.departmentId as string | undefined;
      const items = await prisma.course.findMany({
        where: {
          department: { institutionId: req.user!.institutionId! },
          ...(departmentId && { departmentId }),
        },
        orderBy: { code: 'asc' },
      });
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dept = await prisma.department.findFirst({
        where: { id: req.body.departmentId, institutionId: req.user!.institutionId! },
      });
      if (!dept) throw new NotFoundError('Department');
      const item = await prisma.course.create({ data: req.body });
      sendSuccess(res, item, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.course.findFirst({
        where: { id: req.params.id, department: { institutionId: req.user!.institutionId! } },
      });
      if (!existing) throw new NotFoundError('Course');
      const item = await prisma.course.update({ where: { id: req.params.id }, data: req.body });
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },
};

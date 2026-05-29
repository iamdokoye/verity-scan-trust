import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';

export const facultiesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await prisma.faculty.findMany({
        where: { institutionId: req.user!.institutionId! },
        orderBy: { name: 'asc' },
        include: { _count: { select: { departments: true } } },
      });
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await prisma.faculty.create({
        data: { ...req.body, institutionId: req.user!.institutionId! },
      });
      sendSuccess(res, item, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.faculty.findFirst({
        where: { id: req.params.id, institutionId: req.user!.institutionId! },
      });
      if (!existing) throw new NotFoundError('Faculty');
      const item = await prisma.faculty.update({
        where: { id: req.params.id },
        data: req.body,
      });
      sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.faculty.findFirst({
        where: { id: req.params.id, institutionId: req.user!.institutionId! },
      });
      if (!existing) throw new NotFoundError('Faculty');
      await prisma.faculty.delete({ where: { id: req.params.id } });
      sendSuccess(res, { ok: true });
    } catch (err) {
      next(err);
    }
  },
};

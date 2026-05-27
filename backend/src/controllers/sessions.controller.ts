import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';

export const sessionsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await prisma.academicSession.findMany({
        where: { institutionId: req.user!.institutionId! },
        orderBy: [{ label: 'desc' }, { semester: 'asc' }],
      });
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await prisma.academicSession.create({
        data: { ...req.body, institutionId: req.user!.institutionId! },
      });
      sendSuccess(res, item, 201);
    } catch (err) {
      next(err);
    }
  },
};

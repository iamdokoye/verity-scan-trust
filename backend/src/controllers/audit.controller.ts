import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { AuditAction } from '@prisma/client';

export const auditController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { action, from, to, q } = req.query as Record<string, string | undefined>;
      const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
      const pageSize = Math.min(
        100,
        Math.max(10, parseInt((req.query.pageSize as string) ?? '50', 10))
      );

      const where = {
        actor: { institutionId: req.user!.institutionId },
        ...(action && { action: action as AuditAction }),
        ...(from || to
          ? {
              createdAt: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(to) }),
              },
            }
          : {}),
        ...(q && {
          OR: [
            { targetId: { contains: q } },
            { ipAddress: { contains: q } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { actor: { select: { fullName: true, email: true, role: true } } },
        }),
        prisma.auditLog.count({ where }),
      ]);

      sendSuccess(res, items, 200, { total, page, pageSize });
    } catch (err) {
      next(err);
    }
  },
};

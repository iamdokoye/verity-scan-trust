import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';

export const superAdminController = {
  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const [
        totalInstitutions,
        totalStudents,
        totalDocuments,
        totalVerifications,
        docsByStatus,
        recentAlerts,
        recentActivity,
      ] = await Promise.all([
        prisma.institution.count(),
        prisma.student.count(),
        prisma.document.count(),
        prisma.verificationLog.count(),
        prisma.document.groupBy({ by: ['status'], _count: { id: true } }),
        prisma.auditLog.findMany({
          where: { severity: { in: ['warning', 'critical'] } },
          orderBy: { createdAt: 'desc' },
          take: 6,
          include: { actor: { select: { email: true, fullName: true } } },
        }),
        prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: { actor: { select: { email: true, fullName: true } } },
        }),
      ]);

      sendSuccess(res, {
        totalInstitutions,
        totalStudents,
        totalDocuments,
        totalVerifications,
        documentsByStatus: Object.fromEntries(
          docsByStatus.map((d) => [d.status, d._count.id]),
        ),
        recentAlerts,
        recentActivity,
      });
    } catch (err) {
      next(err);
    }
  },
};

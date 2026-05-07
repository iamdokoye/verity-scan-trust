import { prisma } from '../config/prisma';
import { AuditAction, AuditSeverity, Prisma } from '@prisma/client';

interface AuditEntry {
  actorId?: string;
  actorRole?: string;
  action: AuditAction;
  severity?: AuditSeverity;
  targetType?: string;
  targetId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  async log(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: entry.actorId,
          actorRole: entry.actorRole,
          action: entry.action,
          severity: entry.severity ?? 'info',
          targetType: entry.targetType,
          targetId: entry.targetId,
          ipAddress: entry.ipAddress,
          metadata: (entry.metadata ?? null) as Prisma.InputJsonValue | null,
        },
      });
    } catch (err) {
      // Never throw from audit logging
      console.error('[AuditService] Failed to write audit log:', err);
    }
  }
}

export const auditService = new AuditService();

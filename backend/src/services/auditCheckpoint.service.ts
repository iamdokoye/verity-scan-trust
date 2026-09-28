import crypto from 'crypto';
import { prisma } from '../config/prisma';

export class AuditCheckpointService {
  async createCheckpoint(): Promise<{
    id: string;
    batchHash: string;
    cumulativeHash: string;
    fromEntryId: string;
    toEntryId: string;
    entryCount: number;
    createdAt: Date;
  }> {
    const last = await prisma.auditLogCheckpoint.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { cumulativeHash: true, toEntryId: true, createdAt: true },
    });

    // Fetch all entries added after the last checkpoint (or all entries if first run)
    const entries = await prisma.auditLog.findMany({
      where: last
        ? { createdAt: { gt: last.createdAt } }
        : undefined,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, action: true, severity: true, targetId: true, createdAt: true },
    });

    if (entries.length === 0) {
      throw new Error('No new audit log entries since the last checkpoint.');
    }

    // Hash each entry as "id|action|severity|targetId|createdAt" joined by newline
    const batchContent = entries
      .map(
        (e) =>
          `${e.id}|${e.action}|${e.severity}|${e.targetId ?? ''}|${e.createdAt.toISOString()}`
      )
      .join('\n');

    const batchHash = crypto.createHash('sha256').update(batchContent).digest('hex');

    // Chain: SHA-256(previousCumulativeHash + batchHash)
    const previousCumulative = last?.cumulativeHash ?? '0'.repeat(64);
    const cumulativeHash = crypto
      .createHash('sha256')
      .update(previousCumulative + batchHash)
      .digest('hex');

    const checkpoint = await prisma.auditLogCheckpoint.create({
      data: {
        batchHash,
        cumulativeHash,
        fromEntryId: entries[0].id,
        toEntryId: entries[entries.length - 1].id,
        entryCount: entries.length,
      },
    });

    return checkpoint;
  }

  async listCheckpoints() {
    return prisma.auditLogCheckpoint.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async verifyChain(): Promise<{ valid: boolean; brokenAt?: string }> {
    const checkpoints = await prisma.auditLogCheckpoint.findMany({
      orderBy: { createdAt: 'asc' },
    });

    let previousCumulative = '0'.repeat(64);

    for (const cp of checkpoints) {
      const expected = crypto
        .createHash('sha256')
        .update(previousCumulative + cp.batchHash)
        .digest('hex');

      if (expected !== cp.cumulativeHash) {
        return { valid: false, brokenAt: cp.id };
      }

      previousCumulative = cp.cumulativeHash;
    }

    return { valid: true };
  }
}

export const auditCheckpointService = new AuditCheckpointService();

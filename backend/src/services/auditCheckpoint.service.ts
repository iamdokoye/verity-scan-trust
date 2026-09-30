import crypto from 'crypto';
import { prisma } from '../config/prisma';

const GENESIS = '0'.repeat(64);

type Entry = {
  id: string;
  action: string;
  severity: string;
  targetId: string | null;
  createdAt: Date;
};

/** Entries are ordered by time, then id, so the order is the same every time. */
const ORDER = [{ createdAt: 'asc' as const }, { id: 'asc' as const }];
const SELECT = { id: true, action: true, severity: true, targetId: true, createdAt: true };

/** One line per entry: "id|action|severity|targetId|createdAt", newline-joined. */
function hashBatch(entries: Entry[]): string {
  const content = entries
    .map((e) => `${e.id}|${e.action}|${e.severity}|${e.targetId ?? ''}|${e.createdAt.toISOString()}`)
    .join('\n');
  return crypto.createHash('sha256').update(content).digest('hex');
}

function chain(previousCumulative: string, batchHash: string): string {
  return crypto.createHash('sha256').update(previousCumulative + batchHash).digest('hex');
}

/** Entries strictly after the given one, in checkpoint order. */
function after(entry: Pick<Entry, 'id' | 'createdAt'>) {
  return {
    OR: [
      { createdAt: { gt: entry.createdAt } },
      { createdAt: entry.createdAt, id: { gt: entry.id } },
    ],
  };
}

export type ChainVerification = {
  valid: boolean;
  /** Checkpoint at which the chain stopped matching the audit log. */
  brokenAt?: string;
  reason?:
    | 'cumulative_hash_mismatch'
    | 'entry_missing'
    | 'entry_count_mismatch'
    | 'batch_hash_mismatch';
  checkpointsChecked: number;
  entriesChecked: number;
  /** Entries written since the newest checkpoint; covered by the next one. */
  uncheckpointedEntries: number;
};

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
      select: { cumulativeHash: true, toEntryId: true },
    });

    // Continue from the last entry the previous checkpoint covered, not from
    // the time it was made, so nothing written in between can be skipped.
    const lastEntry = last
      ? await prisma.auditLog.findUnique({
          where: { id: last.toEntryId },
          select: { id: true, createdAt: true },
        })
      : null;
    if (last && !lastEntry) {
      throw new Error('The last checkpointed audit entry is missing. Run the chain verification.');
    }

    const entries = await prisma.auditLog.findMany({
      where: lastEntry ? after(lastEntry) : undefined,
      orderBy: ORDER,
      select: SELECT,
    });

    if (entries.length === 0) {
      throw new Error('No new audit log entries since the last checkpoint.');
    }

    const batchHash = hashBatch(entries);
    const cumulativeHash = chain(last?.cumulativeHash ?? GENESIS, batchHash);

    return prisma.auditLogCheckpoint.create({
      data: {
        batchHash,
        cumulativeHash,
        fromEntryId: entries[0].id,
        toEntryId: entries[entries.length - 1].id,
        entryCount: entries.length,
      },
    });
  }

  async listCheckpoints() {
    return prisma.auditLogCheckpoint.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Checks the chain against the audit log itself, not just against itself.
   * For every checkpoint the entries it covers are read back and hashed again,
   * so a row that was added, removed or rewritten inside a covered range is
   * caught, including rows inserted straight into the database.
   */
  async verifyChain(): Promise<ChainVerification> {
    const checkpoints = await prisma.auditLogCheckpoint.findMany({
      orderBy: { createdAt: 'asc' },
    });

    let previousCumulative = GENESIS;
    let previousTo: Pick<Entry, 'id' | 'createdAt'> | null = null;
    let entriesChecked = 0;

    const broken = (
      cp: { id: string },
      reason: NonNullable<ChainVerification['reason']>,
      checkpointsChecked: number,
    ): ChainVerification => ({
      valid: false,
      brokenAt: cp.id,
      reason,
      checkpointsChecked,
      entriesChecked,
      uncheckpointedEntries: 0,
    });

    for (const [i, cp] of checkpoints.entries()) {
      if (chain(previousCumulative, cp.batchHash) !== cp.cumulativeHash) {
        return broken(cp, 'cumulative_hash_mismatch', i);
      }

      const [from, to] = await Promise.all([
        prisma.auditLog.findUnique({ where: { id: cp.fromEntryId }, select: SELECT }),
        prisma.auditLog.findUnique({ where: { id: cp.toEntryId }, select: SELECT }),
      ]);
      if (!from || !to) return broken(cp, 'entry_missing', i);

      // Everything between the previous checkpoint's last entry and this one's.
      const covered = await prisma.auditLog.findMany({
        where: {
          AND: [
            previousTo ? after(previousTo) : {},
            { OR: [{ createdAt: { lt: to.createdAt } }, { createdAt: to.createdAt, id: { lte: to.id } }] },
          ],
        },
        orderBy: ORDER,
        select: SELECT,
      });

      if (covered.length !== cp.entryCount || covered[0]?.id !== cp.fromEntryId) {
        return broken(cp, 'entry_count_mismatch', i);
      }
      if (hashBatch(covered) !== cp.batchHash) {
        return broken(cp, 'batch_hash_mismatch', i);
      }

      entriesChecked += covered.length;
      previousCumulative = cp.cumulativeHash;
      previousTo = to;
    }

    const uncheckpointedEntries = await prisma.auditLog.count({
      where: previousTo ? after(previousTo) : undefined,
    });

    return {
      valid: true,
      checkpointsChecked: checkpoints.length,
      entriesChecked,
      uncheckpointedEntries,
    };
  }
}

export const auditCheckpointService = new AuditCheckpointService();

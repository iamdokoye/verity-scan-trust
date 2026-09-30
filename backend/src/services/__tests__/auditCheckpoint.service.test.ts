/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Audit checkpoints: the chain is checked against the audit rows themselves,
 * so rows added, removed or rewritten straight in the database are caught.
 * Prisma is replaced by a small in-memory store.
 */
type Row = { id: string; action: string; severity: string; targetId: string | null; createdAt: Date };
type Cp = {
  id: string; batchHash: string; cumulativeHash: string; fromEntryId: string;
  toEntryId: string; entryCount: number; createdAt: Date;
};

const logs: Row[] = [];
const cps: Cp[] = [];

const key = (r: { id: string; createdAt: Date }) => [r.createdAt.getTime(), r.id] as const;
const cmp = (a: Row, b: Row) => {
  const [at, ai] = key(a);
  const [bt, bi] = key(b);
  return at - bt || (ai < bi ? -1 : ai > bi ? 1 : 0);
};

// Understands just the where-shapes the service builds.
function matches(r: Row, w: any): boolean {
  if (!w || Object.keys(w).length === 0) return true;
  if (w.AND) return w.AND.every((x: any) => matches(r, x));
  if (w.OR) return w.OR.some((x: any) => matches(r, x));
  const t = r.createdAt.getTime();
  if (w.createdAt instanceof Date) {
    return t === w.createdAt.getTime() && (w.id?.gt === undefined || r.id > w.id.gt) && (w.id?.lte === undefined || r.id <= w.id.lte);
  }
  if (w.createdAt?.gt) return t > w.createdAt.gt.getTime();
  if (w.createdAt?.lt) return t < w.createdAt.lt.getTime();
  return true;
}

jest.mock('../../config/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: async ({ where }: any) => logs.filter((r) => matches(r, where)).sort(cmp),
      findUnique: async ({ where }: any) => logs.find((r) => r.id === where.id) ?? null,
      count: async ({ where }: any = {}) => logs.filter((r) => matches(r, where)).length,
    },
    auditLogCheckpoint: {
      findMany: async () => [...cps].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      findFirst: async () => [...cps].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null,
      create: async ({ data }: any) => {
        const cp = { id: `cp${cps.length + 1}`, createdAt: new Date(2030, 0, cps.length + 1), ...data };
        cps.push(cp);
        return cp;
      },
    },
  },
}));

import { AuditCheckpointService } from '../auditCheckpoint.service';

const svc = new AuditCheckpointService();
let n = 0;
function addLog(action = 'USER_LOGIN', at = new Date(2025, 0, 1, 0, 0, ++n)) {
  const row = { id: `e${String(n).padStart(3, '0')}`, action, severity: 'info', targetId: null, createdAt: at };
  logs.push(row);
  return row;
}

beforeEach(() => {
  logs.length = 0;
  cps.length = 0;
  n = 0;
  for (let i = 0; i < 3; i++) addLog();
});

describe('audit checkpoint chain', () => {
  it('verifies an untouched log and counts what it checked', async () => {
    await svc.createCheckpoint();
    addLog();
    await svc.createCheckpoint();
    addLog();
    expect(await svc.verifyChain()).toEqual({
      valid: true,
      checkpointsChecked: 2,
      entriesChecked: 4,
      uncheckpointedEntries: 1,
    });
  });

  it('is valid with no checkpoints yet', async () => {
    expect(await svc.verifyChain()).toMatchObject({ valid: true, checkpointsChecked: 0, uncheckpointedEntries: 3 });
  });

  it('continues from the last covered entry, skipping nothing', async () => {
    const first = await svc.createCheckpoint();
    const late = addLog('USER_LOGIN', new Date(2025, 0, 1, 0, 0, 1)); // timestamp inside the covered range
    expect(first.entryCount).toBe(3);
    const second = await svc.createCheckpoint().catch(() => null);
    // A row dated before the last covered entry is not silently absorbed.
    expect(second).toBeNull();
    expect(await svc.verifyChain()).toMatchObject({ valid: false, brokenAt: 'cp1', reason: 'entry_count_mismatch' });
    expect(late.id).toBeDefined();
  });

  it('catches a row inserted straight into a covered range', async () => {
    await svc.createCheckpoint();
    addLog('RESULT_UPDATED', new Date(2025, 0, 1, 0, 0, 2, 500));
    expect(await svc.verifyChain()).toMatchObject({ valid: false, brokenAt: 'cp1', reason: 'entry_count_mismatch' });
  });

  it('catches a covered row that was rewritten', async () => {
    await svc.createCheckpoint();
    logs[1].action = 'DOCUMENT_REVOKED';
    expect(await svc.verifyChain()).toMatchObject({ valid: false, brokenAt: 'cp1', reason: 'batch_hash_mismatch' });
  });

  it('catches a covered row that was deleted', async () => {
    await svc.createCheckpoint();
    logs.splice(1, 1);
    expect(await svc.verifyChain()).toMatchObject({ valid: false, reason: 'entry_count_mismatch' });
  });

  it('catches a deleted boundary entry', async () => {
    await svc.createCheckpoint();
    logs.pop();
    expect(await svc.verifyChain()).toMatchObject({ valid: false, reason: 'entry_missing' });
  });

  it('catches a checkpoint row that was edited', async () => {
    await svc.createCheckpoint();
    addLog();
    await svc.createCheckpoint();
    cps[0].batchHash = 'f'.repeat(64);
    expect(await svc.verifyChain()).toMatchObject({ valid: false, brokenAt: 'cp1', reason: 'cumulative_hash_mismatch' });
  });

  it('catches a whole checkpoint removed from the middle', async () => {
    await svc.createCheckpoint();
    addLog();
    await svc.createCheckpoint();
    addLog();
    await svc.createCheckpoint();
    cps.splice(1, 1);
    expect(await svc.verifyChain()).toMatchObject({ valid: false, brokenAt: 'cp3' });
  });
});

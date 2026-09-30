/**
 * Transcript request workflow. Prisma, issuing, GPA and audit are mocked.
 */
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
process.env.SUPABASE_ANON_KEY = 'k';
process.env.SUPABASE_JWKS_URL = 'https://test.supabase.co/j';
process.env.SUPABASE_STORAGE_BUCKET = 'b';
process.env.DATABASE_URL = 'postgresql://t:t@localhost:5432/t';
process.env.INSTITUTION_PRIVATE_KEY_PEM = 'x';
process.env.INSTITUTION_PUBLIC_KEY_PEM = 'x';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.PORT = '3000';
process.env.NODE_ENV = 'test';

import { Prisma } from '@prisma/client';

const studentFindFirst = jest.fn();
const trCreate = jest.fn();
const trUpdate = jest.fn();
const trUpdateMany = jest.fn();
const trFindFirst = jest.fn();
const trFindUniqueOrThrow = jest.fn();
const docFindFirst = jest.fn();
const issueTranscript = jest.fn();
const getAcademicSummary = jest.fn();
const auditLog = jest.fn().mockResolvedValue(undefined);

jest.mock('../../config/prisma', () => ({
  prisma: {
    student: { findFirst: (...a: unknown[]) => studentFindFirst(...a) },
    document: { findFirst: (...a: unknown[]) => docFindFirst(...a) },
    transcriptRequest: {
      create: (...a: unknown[]) => trCreate(...a),
      update: (...a: unknown[]) => trUpdate(...a),
      updateMany: (...a: unknown[]) => trUpdateMany(...a),
      findFirst: (...a: unknown[]) => trFindFirst(...a),
      findUniqueOrThrow: (...a: unknown[]) => trFindUniqueOrThrow(...a),
    },
  },
}));
jest.mock('../audit.service', () => ({ auditService: { log: (...a: unknown[]) => auditLog(...a) } }));
jest.mock('../gpa.service', () => ({
  gpaService: { getAcademicSummary: (...a: unknown[]) => getAcademicSummary(...a) },
}));
jest.mock('../transcript.service', () => ({
  transcriptService: { issueTranscript: (...a: unknown[]) => issueTranscript(...a) },
}));

import { transcriptRequestService as svc } from '../transcriptRequest.service';
import { AppError } from '../../utils/errors';

const student = { id: 's1', institutionId: 'inst-1' };
const studentUser = { id: 'u-student', role: 'student', institutionId: 'inst-1' };
const admin = { id: 'u-admin', role: 'admin', institutionId: 'inst-1' };
const pendingRequest = { id: 'r1', studentId: 's1', institutionId: 'inst-1', status: 'pending' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('create()', () => {
  it('creates a pending request for the signed-in student and audits it', async () => {
    studentFindFirst.mockResolvedValue(student);
    getAcademicSummary.mockResolvedValue({ totalResults: 4 });
    trCreate.mockResolvedValue({ id: 'r1' });
    await svc.create(studentUser, 'for a scholarship', '1.2.3.4');
    expect(trCreate).toHaveBeenCalledWith({
      data: { studentId: 's1', institutionId: 'inst-1', studentNote: 'for a scholarship' },
    });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TRANSCRIPT_REQUESTED', targetId: 'r1' })
    );
  });

  it('looks the student up by the signed-in profile, not anything the client sends', async () => {
    studentFindFirst.mockResolvedValue(student);
    getAcademicSummary.mockResolvedValue({ totalResults: 1 });
    trCreate.mockResolvedValue({ id: 'r1' });
    await svc.create(studentUser, undefined);
    expect(studentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { profileId: 'u-student', institutionId: 'inst-1' } })
    );
  });

  it('refuses when the student has no results', async () => {
    studentFindFirst.mockResolvedValue(student);
    getAcademicSummary.mockResolvedValue({ totalResults: 0 });
    await expect(svc.create(studentUser, undefined)).rejects.toMatchObject({ code: 'NO_RESULTS' });
    expect(trCreate).not.toHaveBeenCalled();
  });

  it('refuses a second open request (unique index violation)', async () => {
    studentFindFirst.mockResolvedValue(student);
    getAcademicSummary.mockResolvedValue({ totalResults: 2 });
    trCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' })
    );
    await expect(svc.create(studentUser, undefined)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('404s when the user has no student record', async () => {
    studentFindFirst.mockResolvedValue(null);
    await expect(svc.create(studentUser, undefined)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('approve()', () => {
  it('claims the request, issues the transcript and links it', async () => {
    trUpdateMany.mockResolvedValue({ count: 1 });
    trFindUniqueOrThrow.mockResolvedValue(pendingRequest);
    issueTranscript.mockResolvedValue({ id: 'doc-9' });
    trUpdate.mockResolvedValue({ ...pendingRequest, status: 'approved', documentId: 'doc-9' });

    const out = await svc.approve('r1', admin, '1.2.3.4');

    expect(trUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r1', institutionId: 'inst-1', status: 'pending' } })
    );
    expect(issueTranscript).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 's1', institutionId: 'inst-1' })
    );
    expect(out.documentId).toBe('doc-9');
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TRANSCRIPT_REQUEST_APPROVED' })
    );
  });

  it('issues nothing if the request was already decided', async () => {
    trUpdateMany.mockResolvedValue({ count: 0 });
    trFindFirst.mockResolvedValue({ status: 'approved' });
    await expect(svc.approve('r1', admin)).rejects.toMatchObject({ statusCode: 409 });
    expect(issueTranscript).not.toHaveBeenCalled();
  });

  it("404s for another institution's request (never reveals it)", async () => {
    trUpdateMany.mockResolvedValue({ count: 0 });
    trFindFirst.mockResolvedValue(null);
    await expect(svc.approve('r1', admin)).rejects.toMatchObject({ statusCode: 404 });
    expect(issueTranscript).not.toHaveBeenCalled();
  });

  it('puts the request back to pending if issuing fails', async () => {
    trUpdateMany.mockResolvedValue({ count: 1 });
    trFindUniqueOrThrow.mockResolvedValue(pendingRequest);
    issueTranscript.mockRejectedValue(new Error('storage down'));
    trUpdate.mockResolvedValue({});

    await expect(svc.approve('r1', admin)).rejects.toThrow('storage down');
    expect(trUpdate).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { status: 'pending', decidedBy: null, decidedAt: null },
    });
  });

  it('links the existing transcript when an identical one was already issued', async () => {
    trUpdateMany.mockResolvedValue({ count: 1 });
    trFindUniqueOrThrow.mockResolvedValue(pendingRequest);
    issueTranscript.mockRejectedValue(new AppError('dup', 409, 'DUPLICATE_TRANSCRIPT'));
    docFindFirst.mockResolvedValue({ id: 'doc-old' });
    trUpdate.mockResolvedValue({ documentId: 'doc-old' });

    await svc.approve('r1', admin);
    expect(trUpdate).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { documentId: 'doc-old' } });
  });
});

describe('reject()', () => {
  it('rejects a pending request with the note and audits it', async () => {
    trUpdateMany.mockResolvedValue({ count: 1 });
    trFindUniqueOrThrow.mockResolvedValue({ ...pendingRequest, status: 'rejected' });
    await svc.reject('r1', admin, 'Fees outstanding');
    expect(trUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1', institutionId: 'inst-1', status: 'pending' },
        data: expect.objectContaining({ status: 'rejected', decisionNote: 'Fees outstanding' }),
      })
    );
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TRANSCRIPT_REQUEST_REJECTED' })
    );
  });

  it('cannot reject a request that was already decided', async () => {
    trUpdateMany.mockResolvedValue({ count: 0 });
    trFindFirst.mockResolvedValue({ status: 'rejected' });
    await expect(svc.reject('r1', admin, undefined)).rejects.toMatchObject({ statusCode: 409 });
  });
});

/**
 * Verification service: document preview availability and the preview lookup.
 * Prisma, storage and audit logging are mocked; crypto is real.
 */
const { privateKey, publicKey } = (() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto');
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
})();

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_JWKS_URL = 'https://test.supabase.co/auth/v1/.well-known/jwks.json';
process.env.SUPABASE_STORAGE_BUCKET = 'votta-documents';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.INSTITUTION_PRIVATE_KEY_PEM = privateKey;
process.env.INSTITUTION_PUBLIC_KEY_PEM = publicKey;
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.PORT = '3000';
process.env.NODE_ENV = 'test';

const findUnique = jest.fn();
const createLog = jest.fn().mockResolvedValue({});
const downloadFile = jest.fn();

jest.mock('../../config/prisma', () => ({
  prisma: {
    document: { findUnique: (...a: unknown[]) => findUnique(...a) },
    verificationLog: { create: (...a: unknown[]) => createLog(...a) },
  },
}));
jest.mock('../storage.service', () => ({
  storageService: { downloadFile: (...a: unknown[]) => downloadFile(...a) },
}));
jest.mock('../../utils/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }));
jest.mock('../audit.service', () => ({ auditService: { log: jest.fn().mockResolvedValue(undefined) } }));

import { verificationService } from '../verification.service';
import { cryptoService } from '../crypto.service';

const FILE = Buffer.from('%PDF-1.4 original certificate');

function doc(overrides: Record<string, unknown> = {}) {
  const hash = cryptoService.hashFile(FILE);
  return {
    id: 'doc-1',
    status: 'approved',
    filePath: 'i/s/d/file.pdf',
    mimeType: 'application/pdf',
    documentType: 'degree_certificate',
    sha256Hash: hash,
    signature: cryptoService.signHash(hash),
    signedAt: new Date('2026-07-01T00:00:00Z'),
    student: { fullName: 'Ada Obi', matricNumber: '20/CS/001', programme: 'CS' },
    institution: { name: 'University of Uyo', acronym: 'UNIUYO', publicKeyPem: publicKey },
    ...overrides,
  };
}

const verify = (token = 'ABCD2345') =>
  verificationService.verifyByToken({ token, verifierIp: '1.1.1.1', method: 'token' });

beforeEach(() => {
  findUnique.mockReset();
  downloadFile.mockReset();
});

describe('verifyByToken() previewAvailable', () => {
  it('is offered for a verified document', async () => {
    findUnique.mockResolvedValue(doc());
    downloadFile.mockResolvedValue(FILE);
    const r = await verify();
    expect(r).toMatchObject({ status: 'verified', previewAvailable: true, fileMimeType: 'application/pdf' });
  });

  it('is offered for a tampered document (the altered file is what gets shown)', async () => {
    findUnique.mockResolvedValue(doc());
    downloadFile.mockResolvedValue(Buffer.from('%PDF-1.4 forged certificate'));
    const r = await verify();
    expect(r).toMatchObject({ status: 'tampered', previewAvailable: true });
  });

  it('is offered for revoked and superseded documents', async () => {
    findUnique.mockResolvedValue(doc({ status: 'revoked', revocationReason: 'x' }));
    expect(await verify()).toMatchObject({ status: 'revoked', previewAvailable: true });
    findUnique.mockResolvedValue(doc({ status: 'superseded' }));
    expect(await verify()).toMatchObject({ status: 'superseded', previewAvailable: true });
  });

  it('says why when the stored file cannot be retrieved', async () => {
    findUnique.mockResolvedValue(doc());
    downloadFile.mockRejectedValue(new Error('object not found'));
    expect(await verify()).toMatchObject({
      status: 'tampered',
      previewAvailable: false,
      previewUnavailableReason: 'file_missing',
    });
  });

  it('is not offered for an unknown token', async () => {
    findUnique.mockResolvedValue(null);
    const r = await verify('NOPE0000');
    expect(r.status).toBe('not_found');
    expect(r).not.toHaveProperty('previewAvailable');
  });

  it('is not offered when the file type cannot be rendered', async () => {
    findUnique.mockResolvedValue(doc({ mimeType: 'application/zip' }));
    downloadFile.mockResolvedValue(FILE);
    expect(await verify()).toMatchObject({ status: 'verified', previewAvailable: false });
  });
});

describe('getPreview()', () => {
  it('returns the stored file and its type for an approved document', async () => {
    findUnique.mockResolvedValue(doc());
    downloadFile.mockResolvedValue(FILE);
    const p = await verificationService.getPreview('ABCD2345');
    expect(p.mimeType).toBe('application/pdf');
    expect(p.buffer.equals(FILE)).toBe(true);
    expect(downloadFile).toHaveBeenCalledWith('i/s/d/file.pdf');
  });

  it.each(['pending_approval', 'rejected'])('refuses a %s document', async (status) => {
    findUnique.mockResolvedValue(doc({ status }));
    await expect(verificationService.getPreview('ABCD2345')).rejects.toThrow();
    expect(downloadFile).not.toHaveBeenCalled();
  });

  it('refuses an unknown token and never touches storage', async () => {
    findUnique.mockResolvedValue(null);
    await expect(verificationService.getPreview('NOPE0000')).rejects.toThrow();
    expect(downloadFile).not.toHaveBeenCalled();
  });

  it('reports a storage failure as FILE_UNAVAILABLE without leaking internals', async () => {
    findUnique.mockResolvedValue(doc());
    downloadFile.mockRejectedValue(new Error('Storage download failed: bucket "votta-documents" key i/s/d/file.pdf'));
    await expect(verificationService.getPreview('ABCD2345')).rejects.toMatchObject({
      statusCode: 502,
      code: 'FILE_UNAVAILABLE',
      message: 'The document file could not be retrieved.',
    });
  });

  it('refuses file types a browser cannot render safely', async () => {
    findUnique.mockResolvedValue(doc({ mimeType: 'text/html' }));
    await expect(verificationService.getPreview('ABCD2345')).rejects.toThrow();
    expect(downloadFile).not.toHaveBeenCalled();
  });
});

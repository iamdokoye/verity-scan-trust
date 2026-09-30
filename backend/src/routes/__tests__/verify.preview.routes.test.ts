/**
 * The public verification endpoints, through the REAL Express app (helmet,
 * CORS, rate limiting, error handling). Only the database and file storage
 * are replaced, so this catches header/CORS problems a service-level test
 * cannot.
 */
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
process.env.SUPABASE_ANON_KEY = 'k';
process.env.SUPABASE_JWKS_URL = 'https://test.supabase.co/j';
process.env.SUPABASE_STORAGE_BUCKET = 'b';
process.env.DATABASE_URL = 'postgresql://t:t@localhost:5432/t';
process.env.INSTITUTION_PRIVATE_KEY_PEM = 'x';
process.env.INSTITUTION_PUBLIC_KEY_PEM = 'x';
process.env.FRONTEND_URL = 'https://www.votta.xyz';
process.env.PORT = '3000';
process.env.NODE_ENV = 'production';

import request from 'supertest';

const findUnique = jest.fn();
const downloadFile = jest.fn();

jest.mock('../../config/prisma', () => ({
  prisma: {
    document: { findUnique: (...a: unknown[]) => findUnique(...a) },
    verificationLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));
jest.mock('../../services/storage.service', () => ({
  storageService: { downloadFile: (...a: unknown[]) => downloadFile(...a) },
}));
jest.mock('../../utils/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }));
jest.mock('../../services/audit.service', () => ({ auditService: { log: jest.fn() } }));

import { app } from '../../app';

const ORIGIN = 'https://www.votta.xyz';
const PDF = Buffer.from('%PDF-1.4\n% an issued certificate\n', 'latin1');

beforeEach(() => {
  findUnique.mockReset();
  downloadFile.mockReset();
});

describe('GET /api/v1/verify/preview (as the browser calls it)', () => {
  it('returns the file bytes with the right type and CORS headers for the frontend', async () => {
    findUnique.mockResolvedValue({ filePath: 'p', mimeType: 'application/pdf', status: 'approved' });
    downloadFile.mockResolvedValue(PDF);

    const res = await request(app)
      .get('/api/v1/verify/preview?token=R4RZWC3C')
      .set('Origin', ORIGIN)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/pdf/);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers['cache-control']).toBe('no-store');
    expect((res.body as Buffer).equals(PDF)).toBe(true);
  });

  it('answers 404 (not a crash) for an unknown token', async () => {
    findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/v1/verify/preview?token=NOPE0000').set('Origin', ORIGIN);
    expect(res.status).toBe(404);
  });

  it('answers 502 FILE_UNAVAILABLE (not a bare 500) when storage cannot return the file', async () => {
    findUnique.mockResolvedValue({ filePath: 'p', mimeType: 'application/pdf', status: 'approved' });
    downloadFile.mockRejectedValue(new Error('Storage download failed: Object not found'));
    const res = await request(app).get('/api/v1/verify/preview?token=R4RZWC3C').set('Origin', ORIGIN);
    expect(res.status).toBe(502);
    expect(res.body.error).toEqual({ message: 'The document file could not be retrieved.', code: 'FILE_UNAVAILABLE' });
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
  });

  it('answers 400 without a token', async () => {
    const res = await request(app).get('/api/v1/verify/preview').set('Origin', ORIGIN);
    expect(res.status).toBe(400);
  });

  it('refuses a different website (CORS)', async () => {
    findUnique.mockResolvedValue({ filePath: 'p', mimeType: 'application/pdf', status: 'approved' });
    downloadFile.mockResolvedValue(PDF);
    const res = await request(app)
      .get('/api/v1/verify/preview?token=R4RZWC3C')
      .set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('GET /api/v1/verify (the check that tells the page a preview exists)', () => {
  it('reports previewAvailable for a tampered document', async () => {
    findUnique.mockResolvedValue({
      id: 'd1',
      status: 'approved',
      filePath: 'p',
      mimeType: 'application/pdf',
      documentType: 'degree_certificate',
      sha256Hash: 'a'.repeat(64),
      signature: 'sig',
      signedAt: new Date(),
      student: { fullName: 'Ada', matricNumber: 'M1', programme: 'CS' },
      institution: { name: 'Uni', acronym: 'U', publicKeyPem: 'x' },
    });
    downloadFile.mockResolvedValue(PDF); // hash will not match
    const res = await request(app).get('/api/v1/verify?token=R4RZWC3C').set('Origin', ORIGIN);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'tampered',
      previewAvailable: true,
      fileMimeType: 'application/pdf',
    });
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
  });
});

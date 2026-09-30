/**
 * Behavioural tests for the multer upload middleware. They exercise the real
 * middleware through an Express app that mirrors the file-related handling in
 * app.ts's global error handler, so a multer upgrade that changes upload
 * behaviour or error messages is caught here.
 */
import express from 'express';
import request from 'supertest';
import { uploadMiddleware } from '../upload.middleware';
import { AppError } from '../../utils/errors';

function buildApp() {
  const app = express();
  app.post('/upload', uploadMiddleware.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ code: 'NO_FILE' });
    res.json({
      name: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      isBuffer: Buffer.isBuffer(req.file.buffer),
      content: req.file.buffer.toString('hex'),
      body: req.body,
    });
  });
  // Same file-related branches as the global handler in app.ts
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) return res.status(err.statusCode).json({ code: err.code, message: err.message });
    if (err.message?.includes('File too large')) return res.status(400).json({ code: 'FILE_TOO_LARGE' });
    res.status(500).json({ code: 'INTERNAL_ERROR', message: err.message });
  });
  return app;
}

describe('uploadMiddleware', () => {
  const app = buildApp();

  it.each([
    ['application/pdf', 'a.pdf'],
    ['image/jpeg', 'a.jpg'],
    ['image/png', 'a.png'],
    ['image/webp', 'a.webp'],
  ])('accepts %s and keeps the exact bytes in memory', async (mimetype, filename) => {
    const bytes = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0x10, 0x80]);
    const res = await request(app).post('/upload').attach('file', bytes, { filename, contentType: mimetype });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: filename, mimetype, size: bytes.length, isBuffer: true, content: bytes.toString('hex') });
  });

  it('parses text fields sent alongside the file', async () => {
    const res = await request(app)
      .post('/upload')
      .field('studentId', 'abc-123')
      .attach('file', Buffer.from('x'), { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ studentId: 'abc-123' });
  });

  it('rejects a disallowed MIME type with the AppError 400 message', async () => {
    const res = await request(app).post('/upload').attach('file', Buffer.from('x'), { filename: 'a.exe', contentType: 'application/x-msdownload' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid file type. Only PDF and images are allowed.');
  });

  it('accepts a file just under the 5MB limit', async () => {
    const res = await request(app).post('/upload').attach('file', Buffer.alloc(5 * 1024 * 1024 - 1024), { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
  });

  it('rejects a file over 5MB and the error message still contains "File too large"', async () => {
    const res = await request(app).post('/upload').attach('file', Buffer.alloc(5 * 1024 * 1024 + 1024), { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('FILE_TOO_LARGE');
  });

  it('leaves req.file undefined when no file is sent', async () => {
    const res = await request(app).post('/upload').field('a', 'b');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_FILE');
  });

  it('errors on an unexpected file field name', async () => {
    const res = await request(app).post('/upload').attach('other', Buffer.from('x'), { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(500);
    // multer 1.x said "Unexpected field", 2.x says "Unexpected file field"
    expect(res.body.message).toMatch(/^Unexpected (file )?field$/);
  });
});

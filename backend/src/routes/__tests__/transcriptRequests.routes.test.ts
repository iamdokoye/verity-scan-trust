/**
 * Who may call which transcript-request endpoint. Runs the real router and
 * role checks; only authentication and the service layer are replaced.
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

import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';

const svc = {
  create: jest.fn().mockResolvedValue({ id: 'r1' }),
  listMine: jest.fn().mockResolvedValue([]),
  listForInstitution: jest.fn().mockResolvedValue([]),
  approve: jest.fn().mockResolvedValue({ id: 'r1', status: 'approved' }),
  reject: jest.fn().mockResolvedValue({ id: 'r1', status: 'rejected' }),
};

// Auth: the test picks the caller with an x-role header (none = signed out).
jest.mock('../../middleware/auth.middleware', () => ({
  requireAuth: (req: Request, res: Response, next: NextFunction) => {
    const role = req.headers['x-role'] as string | undefined;
    if (!role) return res.status(401).json({ success: false });
    (req as unknown as { user: unknown }).user = {
      id: `user-${role}`,
      role,
      institutionId: 'inst-1',
    };
    next();
  },
}));
jest.mock('../../services/transcriptRequest.service', () => ({ transcriptRequestService: svc }));

import router from '../transcriptRequests.routes';

const app = express();
app.use(express.json());
app.use('/transcript-requests', router);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
  res.status(err.statusCode ?? 500).json({ message: err.message });
});

beforeEach(() => jest.clearAllMocks());

describe('student endpoints', () => {
  it('a student can request and list their own requests', async () => {
    await request(app).post('/transcript-requests').set('x-role', 'student').send({ note: 'visa' }).expect(201);
    expect(svc.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'student' }), 'visa', expect.anything());
    await request(app).get('/transcript-requests/mine').set('x-role', 'student').expect(200);
  });

  it('an admin cannot create a request on a student\'s behalf', async () => {
    await request(app).post('/transcript-requests').set('x-role', 'admin').send({}).expect(403);
    await request(app).get('/transcript-requests/mine').set('x-role', 'admin').expect(403);
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('rejects an over-long note', async () => {
    await request(app).post('/transcript-requests').set('x-role', 'student').send({ note: 'x'.repeat(501) }).expect(400);
    expect(svc.create).not.toHaveBeenCalled();
  });
});

describe('admin endpoints', () => {
  it('a student can neither list, approve nor reject', async () => {
    await request(app).get('/transcript-requests').set('x-role', 'student').expect(403);
    await request(app).post('/transcript-requests/r1/approve').set('x-role', 'student').expect(403);
    await request(app).post('/transcript-requests/r1/reject').set('x-role', 'student').send({}).expect(403);
    expect(svc.approve).not.toHaveBeenCalled();
    expect(svc.reject).not.toHaveBeenCalled();
  });

  it('a super admin (no institution) is not an institution admin here', async () => {
    await request(app).post('/transcript-requests/r1/approve').set('x-role', 'super_admin').expect(403);
  });

  it('an admin can list, approve and reject', async () => {
    await request(app).get('/transcript-requests?status=pending').set('x-role', 'admin').expect(200);
    expect(svc.listForInstitution).toHaveBeenCalledWith('inst-1', 'pending');
    await request(app).post('/transcript-requests/r1/approve').set('x-role', 'admin').expect(200);
    expect(svc.approve).toHaveBeenCalledWith('r1', expect.objectContaining({ role: 'admin' }), expect.anything());
    await request(app).post('/transcript-requests/r1/reject').set('x-role', 'admin').send({ note: 'fees' }).expect(200);
    expect(svc.reject).toHaveBeenCalledWith('r1', expect.anything(), 'fees', expect.anything());
  });

  it('rejects an unknown status filter', async () => {
    await request(app).get('/transcript-requests?status=bogus').set('x-role', 'admin').expect(400);
  });
});

it('everything requires sign-in', async () => {
  await request(app).post('/transcript-requests').send({}).expect(401);
  await request(app).get('/transcript-requests').expect(401);
  await request(app).post('/transcript-requests/r1/approve').expect(401);
});

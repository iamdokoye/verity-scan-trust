/**
 * issueTranscript() must be scoped to the actor's institution.
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

const studentFindFirst = jest.fn();
const studentFindUnique = jest.fn();
const uploadFile = jest.fn();

jest.mock('../../config/prisma', () => ({
  prisma: {
    student: {
      findFirst: (...a: unknown[]) => studentFindFirst(...a),
      findUnique: (...a: unknown[]) => studentFindUnique(...a),
    },
  },
}));
jest.mock('../storage.service', () => ({
  storageService: { uploadFile: (...a: unknown[]) => uploadFile(...a) },
}));
jest.mock('../audit.service', () => ({ auditService: { log: jest.fn() } }));

import { transcriptService } from '../transcript.service';

it("refuses a student from another institution before generating or storing anything", async () => {
  studentFindFirst.mockResolvedValue(null); // not in the admin's institution
  await expect(
    transcriptService.issueTranscript({
      studentId: 'other-tenant-student',
      institutionId: 'inst-1',
      actor: { id: 'admin', role: 'admin' },
    })
  ).rejects.toMatchObject({ statusCode: 404 });

  expect(studentFindFirst).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: 'other-tenant-student', institutionId: 'inst-1' } })
  );
  expect(studentFindUnique).not.toHaveBeenCalled(); // never reached PDF generation
  expect(uploadFile).not.toHaveBeenCalled();
});

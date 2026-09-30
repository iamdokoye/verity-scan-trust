process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
process.env.SUPABASE_ANON_KEY = 'k';
process.env.SUPABASE_JWKS_URL = 'https://test.supabase.co/j';
process.env.SUPABASE_STORAGE_BUCKET = 'votta-documents';
process.env.DATABASE_URL = 'postgresql://t:t@localhost:5432/t';
process.env.INSTITUTION_PRIVATE_KEY_PEM = 'x';
process.env.INSTITUTION_PUBLIC_KEY_PEM = 'x';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.PORT = '3000';
process.env.NODE_ENV = 'test';

const listBuckets = jest.fn();
const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

jest.mock('../supabase', () => ({ supabase: { storage: { listBuckets: (...a: unknown[]) => listBuckets(...a) } } }));
jest.mock('../../utils/logger', () => ({ logger }));

import { checkStorageBucket } from '../storageCheck';

beforeEach(() => jest.clearAllMocks());

it('is quiet and true when the configured bucket exists', async () => {
  listBuckets.mockResolvedValue({ data: [{ name: 'other' }, { name: 'votta-documents' }], error: null });
  expect(await checkStorageBucket()).toBe(true);
  expect(logger.error).not.toHaveBeenCalled();
});

it('logs an error naming the configured and the available buckets when it does not exist', async () => {
  listBuckets.mockResolvedValue({ data: [{ name: 'documents' }, { name: 'avatars' }], error: null });
  expect(await checkStorageBucket()).toBe(false);
  expect(logger.error).toHaveBeenCalledWith(
    expect.stringContaining('"votta-documents" does not exist'),
    { configured: 'votta-documents', available: ['documents', 'avatars'] }
  );
});

it('warns instead of failing when buckets cannot be listed', async () => {
  listBuckets.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } });
  expect(await checkStorageBucket()).toBe(false);
  expect(logger.warn).toHaveBeenCalled();
  expect(logger.error).not.toHaveBeenCalled();
});

it('never throws, even if the request itself blows up', async () => {
  listBuckets.mockRejectedValue(new Error('fetch failed'));
  await expect(checkStorageBucket()).resolves.toBe(false);
});

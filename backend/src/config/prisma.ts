import { PrismaClient } from '@prisma/client';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * The database triggers in supabase/migrations/20240101000008 treat any write
 * whose connection is not labelled with this name as a direct database write
 * and record it in the audit log.
 */
export const APP_NAME = 'votta-api';

/** Adds application_name to the connection string, keeping any the operator set. */
export function withApplicationName(url: string): string {
  if (/[?&]application_name=/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}application_name=${APP_NAME}`;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: { db: { url: withApplicationName(env.DATABASE_URL) } },
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

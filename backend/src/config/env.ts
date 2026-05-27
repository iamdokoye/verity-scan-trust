import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_JWKS_URL: z.string().url(),
  SUPABASE_STORAGE_BUCKET: z.string().default('votta-documents'),
  DATABASE_URL: z.string().min(1),
  INSTITUTION_PRIVATE_KEY_PEM: z.string().min(1),
  INSTITUTION_PUBLIC_KEY_PEM: z.string().min(1),
  // Comma-separated list of allowed frontend origins
  // e.g. "https://www.votta.xyz,https://votta.xyz"
  FRONTEND_URL: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

import { z } from 'zod';

export const createInstitutionSchema = z.object({
  name: z.string().min(2).max(200),
  acronym: z.string().min(1).max(20),
  state: z.string().max(80).optional(),
  adminEmail: z.string().email().max(200),
});

export const updateInstitutionSchema = createInstitutionSchema.partial();

export const provisionAdminSchema = z.object({
  email: z.string().email().max(200),
  fullName: z.string().min(2).max(200),
  // no password — we send a Supabase email invite; user sets their own password
});

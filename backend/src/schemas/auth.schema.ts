import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const signupSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  fullName: z.string().min(2).max(200),
  institutionId: z.string().uuid(),
});

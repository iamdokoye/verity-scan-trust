import { z } from 'zod';

export const createFacultySchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().max(20).optional(),
});

export const updateFacultySchema = createFacultySchema.partial();

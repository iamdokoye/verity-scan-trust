import { z } from 'zod';

export const createSessionSchema = z.object({
  label: z.string().regex(/^\d{4}\/\d{4}$/, 'Use format YYYY/YYYY'),
  semester: z.enum(['first', 'second']),
  isActive: z.boolean().optional(),
});

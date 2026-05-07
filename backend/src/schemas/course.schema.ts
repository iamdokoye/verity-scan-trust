import { z } from 'zod';

export const createCourseSchema = z.object({
  departmentId: z.string().uuid(),
  code: z.string().min(2).max(20).regex(/^[A-Za-z0-9 -]+$/),
  title: z.string().min(2).max(200),
  creditUnits: z.number().int().min(1).max(12),
});

export const updateCourseSchema = createCourseSchema.partial();

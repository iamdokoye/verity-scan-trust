import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(200),
  hodName: z.string().max(200).optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

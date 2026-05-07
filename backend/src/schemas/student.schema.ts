import { z } from 'zod';

export const createStudentSchema = z.object({
  matricNumber: z.string().min(3).max(30).regex(/^[A-Za-z0-9/-]+$/),
  fullName: z.string().min(2).max(200),
  departmentId: z.string().uuid(),
  programme: z.string().max(200).optional(),
  admissionYear: z.number().int().min(1960).max(2100).optional(),
  graduationYear: z.number().int().min(1960).max(2100).optional(),
  profileId: z.string().uuid().optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

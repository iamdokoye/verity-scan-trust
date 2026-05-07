import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  documentType: z.enum(['degree_certificate', 'transcript', 'other']),
  declaredDegreeClass: z.string().max(50).optional(),
  declaredProgramme: z.string().max(200).optional(),
  declaredGraduationYear: z.coerce.number().int().min(1960).max(2100).optional(),
});

export const approveDocumentSchema = z.object({
  approvalNote: z.string().max(1000).optional(),
});

export const rejectDocumentSchema = z.object({
  rejectionReason: z.string().min(3).max(1000),
});

export const supersedeDocumentSchema = z.object({
  supersessionReason: z.string().min(3).max(1000),
});

export const revokeDocumentSchema = z.object({
  revocationReason: z.string().min(3).max(1000),
});

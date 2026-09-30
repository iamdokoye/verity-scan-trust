import { z } from 'zod';

export const createTranscriptRequestSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const decideTranscriptRequestSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const listTranscriptRequestsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

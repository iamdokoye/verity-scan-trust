import { z } from 'zod';

const GRADES = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

const gradeToPoint = (g: (typeof GRADES)[number]): number => {
  switch (g) {
    case 'A':
      return 5;
    case 'B':
      return 4;
    case 'C':
      return 3;
    case 'D':
      return 2;
    case 'E':
      return 1;
    case 'F':
      return 0;
  }
};

export const createResultSchema = z.object({
  studentId: z.string().uuid(),
  sessionId: z.string().uuid(),
  courseId: z.string().uuid(),
  grade: z.enum(GRADES),
});

export const bulkResultSchema = z.object({
  results: z.array(createResultSchema).min(1).max(500),
});

export { GRADES, gradeToPoint };

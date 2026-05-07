import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { sendError } from '../utils/response';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return sendError(
        res,
        'Validation failed: ' +
          result.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(', '),
        400,
        'VALIDATION_ERROR'
      );
    }
    // Replace with parsed (typed) value
    (req as unknown as Record<Source, unknown>)[source] = result.data;
    next();
  };
}

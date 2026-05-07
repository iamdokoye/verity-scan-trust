import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { sendError } from '../utils/response';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Forbidden — insufficient role', 403, 'FORBIDDEN');
    }
    next();
  };
}

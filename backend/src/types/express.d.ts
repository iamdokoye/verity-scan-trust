import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        institutionId?: string; // undefined for super_admin
      };
    }
  }
}

export {};

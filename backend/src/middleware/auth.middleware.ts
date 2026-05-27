import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env';
import { sendError } from '../utils/response';
import { UserRole } from '@prisma/client';

const JWKS = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL));

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(res, 'No token provided', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${env.SUPABASE_URL}/auth/v1`,
    });

    const userId = payload.sub as string;
    const userRole = payload['user_role'] as string;
    const institutionId = payload['institution_id'] as string | undefined;

    if (!userId || !userRole) {
      return sendError(res, 'Invalid token claims', 401, 'UNAUTHORIZED');
    }

    // super_admin has no institution affiliation — all other roles must have one
    if (userRole !== 'super_admin' && !institutionId) {
      return sendError(res, 'Invalid token claims', 401, 'UNAUTHORIZED');
    }

    req.user = {
      id: userId,
      email: payload.email as string,
      role: userRole as UserRole,
      institutionId,
    };

    next();
  } catch {
    sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  }
}

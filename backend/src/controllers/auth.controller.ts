import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { auditService } from '../services/audit.service';
import { prisma } from '../config/prisma';
import { AuthError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const data = await authService.login(email, password);
      if (!data.session) throw new AuthError('Invalid credentials');
      const profile = await prisma.profile.findUnique({
        where: { id: data.user.id },
        select: {
          role: true,
          institutionId: true,
        },
      });
      if (!profile) throw new AuthError('User profile is not configured');
      await auditService.log({
        actorId: data.user?.id,
        action: 'USER_LOGIN',
        severity: 'info',
        ipAddress: req.ip,
        metadata: { email },
      });
      sendSuccess(res, {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: profile.role,
          institutionId: profile.institutionId,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.refresh(req.body.refreshToken);
      if (!data.session) throw new AuthError('Could not refresh');
      sendSuccess(res, {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.split(' ')[1] ?? '';
      await authService.logout(token);
      if (req.user) {
        await auditService.log({
          actorId: req.user.id,
          action: 'USER_LOGOUT',
          ipAddress: req.ip,
        });
      }
      sendSuccess(res, { ok: true });
    } catch (err) {
      next(err);
    }
  },

  async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, fullName, institutionId } = req.body as {
        email: string;
        password: string;
        fullName: string;
        institutionId: string;
      };
      await authService.signup(email, password, fullName, institutionId);
      sendSuccess(
        res,
        { message: 'Account created. Check your email to confirm before logging in.' },
        201,
      );
    } catch (err) {
      next(err);
    }
  },

  me(req: Request, res: Response) {
    sendSuccess(res, req.user);
  },
};

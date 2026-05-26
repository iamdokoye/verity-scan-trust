import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { auditService } from '../services/audit.service';
import { AuthError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const data = await authService.login(email, password);
      await auditService.log({
        actorId: data.user?.id,
        action: 'USER_LOGIN',
        severity: 'info',
        ipAddress: req.ip,
        metadata: { email },
	      });
	      if (!data.session) throw new AuthError('Invalid credentials');
	      sendSuccess(res, {
	        accessToken: data.session.access_token,
	        refreshToken: data.session.refresh_token,
        user: data.user,
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

  me(req: Request, res: Response) {
    sendSuccess(res, req.user);
  },
};

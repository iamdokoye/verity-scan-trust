import { Request, Response, NextFunction } from 'express';
import { verificationService } from '../services/verification.service';
import { sendSuccess, sendError } from '../utils/response';
import { env } from '../config/env';

export const verifyController = {
  async verifyDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const token = (req.query.token as string)?.trim();
      const method = (req.query.method as string) ?? 'token';
      const verifierIp =
        req.ip ?? (req.headers['x-forwarded-for'] as string) ?? 'unknown';
      const verifierOrg = req.query.org as string | undefined;

      if (!token) {
        return sendError(res, 'Verification token is required', 400, 'MISSING_TOKEN');
      }

      const result = await verificationService.verifyByToken({
        token,
        verifierIp,
        method: method === 'qr' ? 'qr' : 'token',
        verifierOrg,
      });

      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  getPublicKey(_req: Request, res: Response) {
    res.type('text/plain').send(env.INSTITUTION_PUBLIC_KEY_PEM);
  },
};

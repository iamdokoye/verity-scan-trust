import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';
import { env } from '../config/env';

export const institutionController = {
  async getMine(req: Request, res: Response, next: NextFunction) {
    try {
      const inst = await prisma.institution.findUnique({
        where: { id: req.user!.institutionId },
      });
      if (!inst) throw new NotFoundError('Institution');
      sendSuccess(res, inst);
    } catch (err) {
      next(err);
    }
  },

  publicKey(_req: Request, res: Response) {
    res.type('text/plain').send(env.INSTITUTION_PUBLIC_KEY_PEM);
  },
};

import { Request, Response, NextFunction } from 'express';
import { transcriptRequestService } from '../services/transcriptRequest.service';
import { sendSuccess } from '../utils/response';

export const transcriptRequestsController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const request = await transcriptRequestService.create(req.user!, req.body.note, req.ip);
      sendSuccess(res, request, 201);
    } catch (err) {
      next(err);
    }
  },

  async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await transcriptRequestService.listMine(req.user!));
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
      sendSuccess(
        res,
        await transcriptRequestService.listForInstitution(req.user!.institutionId!, status)
      );
    } catch (err) {
      next(err);
    }
  },

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await transcriptRequestService.approve(req.params.id, req.user!, req.ip));
    } catch (err) {
      next(err);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(
        res,
        await transcriptRequestService.reject(req.params.id, req.user!, req.body.note, req.ip)
      );
    } catch (err) {
      next(err);
    }
  },
};

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { NotFoundError } from '../utils/errors';
import { env } from '../config/env';
import { supabase } from '../config/supabase';
import { auditService } from '../services/audit.service';

export const institutionController = {
  // ── Public: list institutions for signup dropdown ─────────────────────────

  async listPublic(_req: Request, res: Response, next: NextFunction) {
    try {
      const institutions = await prisma.institution.findMany({
        where: { isActive: true },
        select: { id: true, name: true, acronym: true, state: true },
        orderBy: { name: 'asc' },
      });
      sendSuccess(res, institutions);
    } catch (err) {
      next(err);
    }
  },

  // ── Admin: get own institution ─────────────────────────────────────────────

  async getMine(req: Request, res: Response, next: NextFunction) {
    try {
      const inst = await prisma.institution.findUnique({
        where: { id: req.user!.institutionId! },
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

  // ── Super admin: list all institutions ────────────────────────────────────

  async listAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const institutions = await prisma.institution.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { students: true, documents: true } },
        },
      });
      sendSuccess(res, institutions);
    } catch (err) {
      next(err);
    }
  },

  // ── Super admin: get one institution ─────────────────────────────────────

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const inst = await prisma.institution.findUnique({
        where: { id: req.params.id },
        include: {
          _count: { select: { students: true, documents: true, profiles: true } },
        },
      });
      if (!inst) throw new NotFoundError('Institution');
      sendSuccess(res, inst);
    } catch (err) {
      next(err);
    }
  },

  // ── Super admin: create institution ──────────────────────────────────────

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const institution = await prisma.institution.create({
        data: req.body,
        include: { _count: { select: { students: true, documents: true } } },
      });
      await auditService.log({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'INSTITUTION_CREATED',
        targetType: 'Institution',
        targetId: institution.id,
        ipAddress: req.ip,
        metadata: { name: institution.name, acronym: institution.acronym },
      });
      sendSuccess(res, institution, 201);
    } catch (err) {
      next(err);
    }
  },

  // ── Super admin: update institution ──────────────────────────────────────

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.institution.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) throw new NotFoundError('Institution');

      const institution = await prisma.institution.update({
        where: { id: req.params.id },
        data: req.body,
        include: { _count: { select: { students: true, documents: true } } },
      });
      await auditService.log({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'INSTITUTION_UPDATED',
        targetType: 'Institution',
        targetId: institution.id,
        ipAddress: req.ip,
        metadata: req.body as Record<string, unknown>,
      });
      sendSuccess(res, institution);
    } catch (err) {
      next(err);
    }
  },

  // ── Super admin: provision an admin for an institution ────────────────────

  async provisionAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: institutionId } = req.params;
      const { email, fullName } = req.body as {
        email: string;
        fullName: string;
      };

      const institution = await prisma.institution.findUnique({
        where: { id: institutionId },
      });
      if (!institution) throw new NotFoundError('Institution');

      // Build the redirect URL from the first allowed frontend origin
      const frontendOrigin = env.FRONTEND_URL.split(',')[0].trim();
      const redirectTo = `${frontendOrigin}/auth/accept-invite`;

      // Send email invite — the handle_new_user trigger auto-creates the profile
      // on user row creation (which happens immediately on inviteUserByEmail)
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          role: 'admin',
          institution_id: institutionId,
          full_name: fullName,
        },
      });

      if (error) throw new Error(error.message);

      await auditService.log({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'ADMIN_PROVISIONED',
        targetType: 'Profile',
        targetId: data.user.id,
        ipAddress: req.ip,
        metadata: {
          email,
          institutionId,
          institutionName: institution.name,
        },
      });

      sendSuccess(res, { userId: data.user.id, email: data.user.email }, 201);
    } catch (err) {
      next(err);
    }
  },

  // ── Super admin: suspend institution ─────────────────────────────────────

  async suspend(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.institution.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) throw new NotFoundError('Institution');

      const institution = await prisma.institution.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
      await auditService.log({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'INSTITUTION_SUSPENDED',
        targetType: 'Institution',
        targetId: institution.id,
        ipAddress: req.ip,
        metadata: { name: institution.name },
      });
      sendSuccess(res, institution);
    } catch (err) {
      next(err);
    }
  },

  // ── Super admin: reactivate institution ──────────────────────────────────

  async reactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.institution.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) throw new NotFoundError('Institution');

      const institution = await prisma.institution.update({
        where: { id: req.params.id },
        data: { isActive: true },
      });
      await auditService.log({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'INSTITUTION_REACTIVATED',
        targetType: 'Institution',
        targetId: institution.id,
        ipAddress: req.ip,
        metadata: { name: institution.name },
      });
      sendSuccess(res, institution);
    } catch (err) {
      next(err);
    }
  },

  // ── Super admin: delete institution (only if empty) ───────────────────────

  async deleteInstitution(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.institution.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { students: true, documents: true } } },
      });
      if (!existing) throw new NotFoundError('Institution');

      if (existing._count.students > 0 || existing._count.documents > 0) {
        return sendError(
          res,
          'Cannot delete an institution that has students or documents. Suspend it instead.',
          409,
          'INSTITUTION_NOT_EMPTY',
        );
      }

      await prisma.institution.delete({ where: { id: req.params.id } });

      await auditService.log({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'INSTITUTION_DELETED',
        targetType: 'Institution',
        targetId: req.params.id,
        ipAddress: req.ip,
        metadata: { name: existing.name, acronym: existing.acronym },
      });
      sendSuccess(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  },
};

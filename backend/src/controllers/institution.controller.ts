import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';
import { env } from '../config/env';
import { supabase } from '../config/supabase';
import { auditService } from '../services/audit.service';

export const institutionController = {
  // ── Public: list institutions for signup dropdown ─────────────────────────

  async listPublic(_req: Request, res: Response, next: NextFunction) {
    try {
      const institutions = await prisma.institution.findMany({
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
      const { email, fullName, password } = req.body as {
        email: string;
        fullName: string;
        password: string;
      };

      const institution = await prisma.institution.findUnique({
        where: { id: institutionId },
      });
      if (!institution) throw new NotFoundError('Institution');

      // Create auth user — the handle_new_user trigger auto-creates the profile
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
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
};

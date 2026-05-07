import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { institutionController } from '../controllers/institution.controller';

const router = Router();

router.get('/me', requireAuth, institutionController.getMine);
router.get('/public-key', institutionController.publicKey);

export default router;

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authRateLimit } from '../middleware/rateLimit.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { loginSchema, refreshSchema, signupSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/login', authRateLimit, validate(loginSchema), authController.login);
router.post('/signup', authRateLimit, validate(signupSchema), authController.signup);
router.post('/refresh', authRateLimit, validate(refreshSchema), authController.refresh);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;

import { Router } from 'express';
import { verifyRateLimit } from '../middleware/rateLimit.middleware';
import { verifyController } from '../controllers/verify.controller';

const router = Router();

router.get('/', verifyRateLimit, verifyController.verifyDocument);
router.get('/preview', verifyRateLimit, verifyController.previewDocument);
router.get('/public-key', verifyController.getPublicKey);

export default router;

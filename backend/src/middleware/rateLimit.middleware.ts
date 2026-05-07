import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: { message: 'Too many login attempts. Try again in 1 minute.', code: 'RATE_LIMITED' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const verifyRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

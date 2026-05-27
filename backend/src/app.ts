import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRateLimit } from './middleware/rateLimit.middleware';
import { router } from './routes';
import { sendError } from './utils/response';
import { AppError } from './utils/errors';
import { env } from './config/env';

export const app = express();

app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — parse comma-separated FRONTEND_URL into an allowed origins list
const allowedOrigins = env.FRONTEND_URL.split(',')
  .map((u) => u.trim())
  .filter(Boolean);

// Always allow localhost in development
if (env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no origin) and listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
app.use('/api', apiRateLimit);

// Health check — no auth required
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// All API routes
app.use('/api/v1', router);

// 404 handler
app.use((_req, res) => {
  sendError(res, 'Route not found', 404, 'NOT_FOUND');
});

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    if (err instanceof AppError) {
      return sendError(res, err.message, err.statusCode, err.code);
    }

    if (err.message?.includes('File too large')) {
      return sendError(res, 'File exceeds 5MB limit', 400, 'FILE_TOO_LARGE');
    }

    console.error('[Unhandled Error]', err);
    sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR');
  }
);

import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { checkStorageBucket } from './config/storageCheck';
import { logger } from './utils/logger';

const port = parseInt(env.PORT, 10);

async function start() {
  try {
    await prisma.$connect();
    logger.info('Database connection established');
  } catch (err) {
    logger.error('Failed to connect to database', { error: err });
    process.exit(1);
  }

  // Report a wrong storage bucket name now rather than on the first upload.
  void checkStorageBucket();

  const server = app.listen(port, () => {
    logger.info(`Votta API listening on http://localhost:${port}`, {
      env: env.NODE_ENV,
    });
  });

  function shutdown(signal: string) {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server closed');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();

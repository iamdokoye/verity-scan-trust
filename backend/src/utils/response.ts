import { Response } from 'express';

export const sendSuccess = (
  res: Response,
  data: unknown,
  statusCode = 200,
  meta?: Record<string, unknown>
) => {
  res.status(statusCode).json({
    success: true,
    data,
    ...(meta && { meta }),
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  code?: string
) => {
  res.status(statusCode).json({
    success: false,
    error: { message, code },
  });
};

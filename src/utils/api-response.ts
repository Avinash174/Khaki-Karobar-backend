import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: any;
}

export function sendSuccess<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data: data !== undefined ? data : null,
  });
}

export function sendError(
  res: Response,
  message: string,
  error = 'BAD_REQUEST',
  statusCode = 400,
  details?: any
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
    ...(details ? { details } : {}),
  });
}

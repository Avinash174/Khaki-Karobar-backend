import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/api-response';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): any {
  console.error('Unhandled error:', err);

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return sendError(res, 'A record with this unique value already exists', 'UNIQUE_CONSTRAINT', 409);
    }
    if (err.code === 'P2025') {
      return sendError(res, 'The requested record was not found', 'RECORD_NOT_FOUND', 404);
    }
  }

  return sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error'),
    'INTERNAL_SERVER_ERROR',
    err.statusCode || 500
  );
}

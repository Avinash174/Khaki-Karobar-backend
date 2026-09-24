import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/api-response';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): any => {
    try {
      req.body = schema.parse(req.body);
      return next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return sendError(res, `Validation failed: ${errorMessages}`, 'VALIDATION_ERROR', 422, err.errors);
      }
      return sendError(res, 'Invalid request data', 'VALIDATION_ERROR', 422);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): any => {
    try {
      req.query = schema.parse(req.query) as any;
      return next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return sendError(res, `Query validation failed: ${errorMessages}`, 'VALIDATION_ERROR', 422, err.errors);
      }
      return sendError(res, 'Invalid query parameters', 'VALIDATION_ERROR', 422);
    }
  };
}

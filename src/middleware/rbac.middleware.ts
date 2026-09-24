import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { sendError } from '../utils/api-response';

export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): any {
  if (req.user?.globalRole !== 'SUPER_ADMIN') {
    return sendError(res, 'Access denied: Super Admin privileges required', 'FORBIDDEN', 403);
  }
  return next();
}

export function requireBusinessRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (req.user?.globalRole === 'SUPER_ADMIN') {
      return next(); // Super admin bypass
    }

    if (!req.businessRole || !allowedRoles.includes(req.businessRole)) {
      return sendError(
        res,
        `Access denied: requires one of the following roles: ${allowedRoles.join(', ')}`,
        'FORBIDDEN',
        403
      );
    }
    return next();
  };
}

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { sendError } from '../utils/api-response';
import prisma from '../config/prisma';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload & { name: string; globalRole: string };
  businessId?: string;
  businessRole?: string;
}

export async function authenticateJwt(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Authentication token missing or invalid', 'UNAUTHORIZED', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, phone: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return sendError(res, 'User not found or account is deactivated', 'UNAUTHORIZED', 401);
    }

    req.user = {
      ...payload,
      name: user.name,
      globalRole: user.role,
    };

    // Extract business context from header or token
    const headerBusinessId = req.headers['x-business-id'] as string;
    const businessId = headerBusinessId || payload.businessId;

    if (businessId) {
      req.businessId = businessId;

      // If user is super admin, grant implicit owner permissions
      if (user.role === 'SUPER_ADMIN') {
        req.businessRole = 'OWNER';
      } else {
        const member = await prisma.businessMember.findUnique({
          where: {
            businessId_userId: {
              businessId,
              userId: user.id,
            },
          },
        });
        if (member) {
          req.businessRole = member.role;
        }
      }
    }

    return next();
  } catch (err: any) {
    return sendError(res, 'Session expired or invalid token', 'TOKEN_EXPIRED', 401);
  }
}

export function requireBusiness(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): any {
  if (!req.businessId) {
    return sendError(
      res,
      'Active business header (x-business-id) is required for this operation',
      'BUSINESS_REQUIRED',
      400
    );
  }
  return next();
}

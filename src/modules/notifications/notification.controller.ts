import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess } from '../../utils/api-response';

export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<any> {
  const userId = req.user?.userId;
  const businessId = req.businessId;

  const notifications = await prisma.notification.findMany({
    where: {
      OR: [
        { userId },
        ...(businessId ? [{ businessId }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return sendSuccess(res, 'Notifications retrieved', notifications);
}

export async function markAsRead(req: AuthenticatedRequest, res: Response): Promise<any> {
  const id = req.params.id as string;

  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return sendSuccess(res, 'Notification marked as read');
}

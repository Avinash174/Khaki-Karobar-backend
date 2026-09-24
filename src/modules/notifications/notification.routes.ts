import { Router } from 'express';
import { getNotifications, markAsRead } from './notification.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);

export default router;

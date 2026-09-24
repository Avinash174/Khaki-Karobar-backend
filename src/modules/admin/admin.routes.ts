import { Router } from 'express';
import { getAdminDashboard, getAdminUsers, getAdminBusinesses } from './admin.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';
import { requireSuperAdmin } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticateJwt, requireSuperAdmin);

router.get('/dashboard', getAdminDashboard);
router.get('/users', getAdminUsers);
router.get('/businesses', getAdminBusinesses);

export default router;

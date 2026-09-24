import { Router } from 'express';
import { getDashboardOverview, getSalesReport, getOutstandingReport } from './report.controller';
import { authenticateJwt, requireBusiness } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt, requireBusiness);

router.get('/dashboard', getDashboardOverview);
router.get('/sales', getSalesReport);
router.get('/outstanding', getOutstandingReport);

export default router;

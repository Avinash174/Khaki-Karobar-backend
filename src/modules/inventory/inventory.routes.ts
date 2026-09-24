import { Router } from 'express';
import {
  getInventorySummary,
  getLowStockAlerts,
  adjustStock,
  getStockMovements,
} from './inventory.controller';
import { authenticateJwt, requireBusiness } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt, requireBusiness);

router.get('/summary', getInventorySummary);
router.get('/low-stock', getLowStockAlerts);
router.post('/adjust', adjustStock);
router.get('/movements', getStockMovements);

export default router;

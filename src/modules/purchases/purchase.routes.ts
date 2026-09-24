import { Router } from 'express';
import { createPurchase, getPurchases, getPurchaseById } from './purchase.controller';
import { authenticateJwt, requireBusiness } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt, requireBusiness);

router.post('/', createPurchase);
router.get('/', getPurchases);
router.get('/:id', getPurchaseById);

export default router;

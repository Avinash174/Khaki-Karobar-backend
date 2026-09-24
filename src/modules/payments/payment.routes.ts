import { Router } from 'express';
import { createPayment, getPayments } from './payment.controller';
import { authenticateJwt, requireBusiness } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt, requireBusiness);

router.post('/', createPayment);
router.get('/', getPayments);

export default router;

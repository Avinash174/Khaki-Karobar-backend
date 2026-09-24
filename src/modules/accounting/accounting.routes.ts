import { Router } from 'express';
import { getDayBook, getCashBook, getBankBook, getProfitAndLoss } from './accounting.controller';
import { authenticateJwt, requireBusiness } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt, requireBusiness);

router.get('/day-book', getDayBook);
router.get('/cash-book', getCashBook);
router.get('/bank-book', getBankBook);
router.get('/profit-and-loss', getProfitAndLoss);

export default router;

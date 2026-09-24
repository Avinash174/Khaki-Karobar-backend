import { Router } from 'express';
import {
  createExpense,
  getExpenses,
  getExpenseCategories,
  createExpenseCategory,
} from './expense.controller';
import { authenticateJwt, requireBusiness } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt, requireBusiness);

router.post('/', createExpense);
router.get('/', getExpenses);
router.get('/categories', getExpenseCategories);
router.post('/categories', createExpenseCategory);

export default router;

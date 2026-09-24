import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerLedger,
} from './customer.controller';
import { authenticateJwt, requireBusiness } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt, requireBusiness);

router.post('/', createCustomer);
router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.get('/:id/ledger', getCustomerLedger);

export default router;

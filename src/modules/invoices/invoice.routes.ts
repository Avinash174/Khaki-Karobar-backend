import { Router } from 'express';
import { createInvoice, getInvoices, getInvoiceById, cancelInvoice } from './invoice.controller';
import { authenticateJwt, requireBusiness } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt, requireBusiness);

router.post('/', createInvoice);
router.get('/', getInvoices);
router.get('/:id', getInvoiceById);
router.post('/:id/cancel', cancelInvoice);

export default router;

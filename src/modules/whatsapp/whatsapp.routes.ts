import { Router } from 'express';
import { shareInvoiceWhatsApp, sendPaymentReminderWhatsApp } from './whatsapp.controller';
import { authenticateJwt, requireBusiness } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt, requireBusiness);

router.post('/share-invoice', shareInvoiceWhatsApp);
router.post('/payment-reminder', sendPaymentReminderWhatsApp);

export default router;

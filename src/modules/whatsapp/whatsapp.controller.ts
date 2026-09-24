import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/api-response';
import { WhatsAppService } from './whatsapp.service';

export async function shareInvoiceWhatsApp(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const { invoiceId, phone } = req.body;

  if (!invoiceId) {
    return sendError(res, 'Invoice ID is required', 'MISSING_FIELDS', 400);
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    include: {
      customer: true,
      business: true,
    },
  });

  if (!invoice) {
    return sendError(res, 'Invoice not found', 'INVOICE_NOT_FOUND', 404);
  }

  const targetPhone = phone || invoice.customer.phone;
  const messageText = WhatsAppService.generateInvoiceShareText(
    invoice.business.name,
    invoice.customer.name,
    invoice.invoiceNumber,
    Number(invoice.grandTotal),
    Number(invoice.balanceAmount)
  );

  const result = await WhatsAppService.sendMessage({
    toPhone: targetPhone,
    messageText,
  });

  return sendSuccess(res, 'Invoice shared via WhatsApp', {
    phone: targetPhone,
    messageId: result.messageId,
    simulated: result.simulated,
  });
}

export async function sendPaymentReminderWhatsApp(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const { customerId } = req.body;

  if (!customerId) {
    return sendError(res, 'Customer ID is required', 'MISSING_FIELDS', 400);
  }

  const [business, customer] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId } }),
    prisma.customer.findFirst({ where: { id: customerId, businessId } }),
  ]);

  if (!business || !customer) {
    return sendError(res, 'Business or Customer not found', 'NOT_FOUND', 404);
  }

  if (Number(customer.currentBalance) <= 0) {
    return sendError(res, 'Customer has no outstanding balance', 'NO_DUE_BALANCE', 400);
  }

  const messageText = WhatsAppService.generatePaymentReminderText(
    business.name,
    customer.name,
    Number(customer.currentBalance)
  );

  const result = await WhatsAppService.sendMessage({
    toPhone: customer.phone,
    messageText,
  });

  return sendSuccess(res, 'Payment reminder sent via WhatsApp', {
    phone: customer.phone,
    messageId: result.messageId,
    simulated: result.simulated,
  });
}

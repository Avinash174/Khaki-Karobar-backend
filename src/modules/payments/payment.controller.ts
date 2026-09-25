import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/api-response';
import { PaymentType, PartyType, PaymentMethod, EntryType, InvoiceStatus, PurchaseStatus } from '@prisma/client';

export async function createPayment(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const {
    type, // RECEIVED or MADE
    partyType, // CUSTOMER or SUPPLIER
    customerId,
    supplierId,
    invoiceId,
    purchaseId,
    amount,
    paymentMethod,
    referenceNumber,
    paymentDate,
    notes,
  } = req.body;

  let paymentType = type;
  if (paymentType === 'IN' || (!paymentType && partyType === 'CUSTOMER')) paymentType = PaymentType.RECEIVED;
  if (paymentType === 'OUT' || (!paymentType && partyType === 'SUPPLIER')) paymentType = PaymentType.MADE;

  const payAmount = Number(amount);
  if (!paymentType || !partyType || !payAmount || payAmount <= 0) {
    return sendError(res, 'Valid type, partyType, and positive amount are required', 'INVALID_INPUT', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Customer Payment (RECEIVED)
    if (partyType === 'CUSTOMER' && customerId) {
      const customer = await tx.customer.findFirst({ where: { id: customerId, businessId } });
      if (!customer) throw new Error('Customer not found');

      // If tied to an invoice, update invoice paid & balance amount
      if (invoiceId) {
        const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, businessId } });
        if (invoice) {
          const newPaid = Number(invoice.paidAmount) + payAmount;
          const newBalance = Math.max(0, Number(invoice.balanceAmount) - payAmount);
          const newStatus = newBalance === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              paidAmount: newPaid,
              balanceAmount: newBalance,
              status: newStatus,
            },
          });
        }
      }

      // Decrement customer outstanding balance
      const newCustBal = Math.max(0, Number(customer.currentBalance) - payAmount);
      await tx.customer.update({
        where: { id: customerId },
        data: { currentBalance: newCustBal },
      });

      // Create Payment record
      const pmt = await tx.payment.create({
        data: {
          businessId,
          type: PaymentType.RECEIVED,
          partyType: PartyType.CUSTOMER,
          customerId,
          invoiceId: invoiceId || null,
          amount: payAmount,
          paymentMethod: (paymentMethod as PaymentMethod) || PaymentMethod.CASH,
          referenceNumber: referenceNumber || null,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes: notes || 'Payment received from customer',
          status: 'COMPLETED',
        },
      });

      // Customer Ledger Credit
      await tx.ledgerEntry.create({
        data: {
          businessId,
          partyType: PartyType.CUSTOMER,
          partyId: customerId,
          entryType: EntryType.CREDIT,
          amount: payAmount,
          balanceAfter: newCustBal,
          referenceType: 'PAYMENT',
          referenceId: pmt.id,
          description: `Payment received (${paymentMethod || 'CASH'})${referenceNumber ? ` ref: ${referenceNumber}` : ''}`,
        },
      });

      return pmt;
    }

    // 2. Supplier Payment (MADE)
    if (partyType === 'SUPPLIER' && supplierId) {
      const supplier = await tx.supplier.findFirst({ where: { id: supplierId, businessId } });
      if (!supplier) throw new Error('Supplier not found');

      if (purchaseId) {
        const purchase = await tx.purchase.findFirst({ where: { id: purchaseId, businessId } });
        if (purchase) {
          const newPaid = Number(purchase.paidAmount) + payAmount;
          const newBalance = Math.max(0, Number(purchase.balanceAmount) - payAmount);
          const newStatus = newBalance === 0 ? PurchaseStatus.PAID : PurchaseStatus.PARTIALLY_PAID;

          await tx.purchase.update({
            where: { id: purchaseId },
            data: {
              paidAmount: newPaid,
              balanceAmount: newBalance,
              status: newStatus,
            },
          });
        }
      }

      // Decrement supplier payable balance
      const newSuppBal = Math.max(0, Number(supplier.currentBalance) - payAmount);
      await tx.supplier.update({
        where: { id: supplierId },
        data: { currentBalance: newSuppBal },
      });

      const pmt = await tx.payment.create({
        data: {
          businessId,
          type: PaymentType.MADE,
          partyType: PartyType.SUPPLIER,
          supplierId,
          purchaseId: purchaseId || null,
          amount: payAmount,
          paymentMethod: (paymentMethod as PaymentMethod) || PaymentMethod.BANK_TRANSFER,
          referenceNumber: referenceNumber || null,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes: notes || 'Payment made to supplier',
          status: 'COMPLETED',
        },
      });

      // Supplier Ledger Debit
      await tx.ledgerEntry.create({
        data: {
          businessId,
          partyType: PartyType.SUPPLIER,
          partyId: supplierId,
          entryType: EntryType.DEBIT,
          amount: payAmount,
          balanceAfter: newSuppBal,
          referenceType: 'PAYMENT',
          referenceId: pmt.id,
          description: `Payment made (${paymentMethod || 'BANK_TRANSFER'})${referenceNumber ? ` ref: ${referenceNumber}` : ''}`,
        },
      });

      return pmt;
    }

    throw new Error('Valid customerId or supplierId must be provided');
  });

  return sendSuccess(res, 'Payment recorded and ledgers updated successfully', result, 201);
}

export async function getPayments(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const type = req.query.type as PaymentType;
  const partyType = req.query.partyType as PartyType;

  const whereClause: any = { businessId };
  if (type) whereClause.type = type;
  if (partyType) whereClause.partyType = partyType;

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where: whereClause }),
    prisma.payment.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { paymentDate: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        supplier: { select: { id: true, name: true, phone: true } },
        invoice: { select: { id: true, invoiceNumber: true, grandTotal: true } },
        purchase: { select: { id: true, purchaseNumber: true, grandTotal: true } },
      },
    }),
  ]);

  return sendSuccess(res, 'Payments retrieved successfully', {
    items: payments,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/api-response';
import { calculateItemGst } from '../../utils/gst-calculator';
import { InvoiceType, InvoiceStatus, PaymentMethod, PaymentType, PartyType, EntryType, StockMovementType } from '@prisma/client';

export async function createInvoice(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const {
    customerId,
    invoiceDate,
    dueDate,
    type,
    items,
    discountType,
    discountValue,
    notes,
    terms,
    initialPayment, // { amount, paymentMethod, referenceNumber }
  } = req.body;

  if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
    return sendError(res, 'Customer and at least one item are required', 'MISSING_FIELDS', 400);
  }

  // 1. Fetch Business and Customer for state codes (GST intra vs inter state)
  const [business, customer] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId } }),
    prisma.customer.findFirst({ where: { id: customerId, businessId } }),
  ]);

  if (!business || !customer) {
    return sendError(res, 'Business or Customer not found', 'NOT_FOUND', 404);
  }

  const isInterState = Boolean(
    business.stateCode &&
    customer.stateCode &&
    business.stateCode !== customer.stateCode
  );

  // 2. Generate unique invoice number: INV-YYYYMM-XXXX
  const today = new Date();
  const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.invoice.count({
    where: {
      businessId,
      invoiceDate: {
        gte: new Date(today.getFullYear(), today.getMonth(), 1),
      },
    },
  });
  const invoiceNumber = `INV-${yearMonth}-${String(count + 1).padStart(4, '0')}`;

  // 3. Process items and calculate GST
  let subtotal = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTax = 0;
  const processedItems: any[] = [];

  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, businessId },
    });

    if (!product) {
      return sendError(res, `Product ${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
    }

    const qty = Number(item.quantity);
    const unitPrice = Number(item.unitPrice || product.sellingPrice);
    const gstRate = item.gstRate !== undefined ? Number(item.gstRate) : Number(product.gstRate);

    const calc = calculateItemGst(
      {
        quantity: qty,
        unitPrice,
        discountPercent: item.discountPercent ? Number(item.discountPercent) : 0,
        discountAmount: item.discountAmount ? Number(item.discountAmount) : 0,
        gstRate,
      },
      isInterState
    );

    subtotal += Number((qty * unitPrice).toFixed(2));
    totalTaxable += calc.taxableAmount;
    totalCgst += calc.cgstAmount;
    totalSgst += calc.sgstAmount;
    totalIgst += calc.igstAmount;
    totalTax += calc.totalTax;

    processedItems.push({
      productId: product.id,
      productName: product.name,
      isService: product.isService,
      currentStock: Number(product.currentStock),
      description: item.description || product.name,
      hsnCode: item.hsnCode || product.hsnCode,
      quantity: qty,
      unit: item.unit || product.unit,
      unitPrice,
      discountPercent: item.discountPercent ? Number(item.discountPercent) : 0,
      discountAmount: calc.discountAmount,
      taxableAmount: calc.taxableAmount,
      gstRate,
      cgstAmount: calc.cgstAmount,
      sgstAmount: calc.sgstAmount,
      igstAmount: calc.igstAmount,
      totalAmount: calc.totalAmount,
    });
  }

  // Invoice level discount (if any)
  let invDiscount = 0;
  if (discountType === 'PERCENT' && discountValue) {
    invDiscount = Number(((totalTaxable * Number(discountValue)) / 100).toFixed(2));
  } else if (discountType === 'AMOUNT' && discountValue) {
    invDiscount = Number(discountValue);
  }

  const netTaxable = Math.max(0, totalTaxable - invDiscount);
  const rawGrandTotal = netTaxable + totalTax;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));

  // Determine initial payment and status
  const paidAmount = initialPayment?.amount ? Math.min(roundedGrandTotal, Number(initialPayment.amount)) : 0;
  const balanceAmount = roundedGrandTotal - paidAmount;

  let invoiceStatus: InvoiceStatus = InvoiceStatus.ISSUED;
  if (balanceAmount === 0 && paidAmount > 0) {
    invoiceStatus = InvoiceStatus.PAID;
  } else if (paidAmount > 0 && balanceAmount > 0) {
    invoiceStatus = InvoiceStatus.PARTIALLY_PAID;
  } else {
    invoiceStatus = InvoiceStatus.UNPAID;
  }

  // 4. Atomic Transaction Execution
  const invoice = await prisma.$transaction(async (tx) => {
    // A. Create Invoice
    const newInvoice = await tx.invoice.create({
      data: {
        businessId,
        customerId,
        invoiceNumber,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        type: (type as InvoiceType) || InvoiceType.TAX_INVOICE,
        status: invoiceStatus,
        isB2B: Boolean(customer.gstin),
        subtotal,
        discountType: discountType || 'AMOUNT',
        discountValue: discountValue ? Number(discountValue) : 0,
        discountAmount: invDiscount,
        taxableAmount: netTaxable,
        cgstAmount: totalCgst,
        sgstAmount: totalSgst,
        igstAmount: totalIgst,
        totalTax,
        roundOff,
        grandTotal: roundedGrandTotal,
        paidAmount,
        balanceAmount,
        notes: notes || 'Thank you for your business!',
        terms: terms || 'Payment due as per agreed terms.',
        items: {
          create: processedItems.map((item) => ({
            productId: item.productId,
            description: item.description,
            hsnCode: item.hsnCode,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            taxableAmount: item.taxableAmount,
            gstRate: item.gstRate,
            cgstAmount: item.cgstAmount,
            sgstAmount: item.sgstAmount,
            igstAmount: item.igstAmount,
            totalAmount: item.totalAmount,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    // B. Update stock and stock movement for each physical product
    for (const item of processedItems) {
      if (!item.isService) {
        const newStock = Math.max(0, item.currentStock - item.quantity);
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            businessId,
            productId: item.productId,
            type: StockMovementType.SALE,
            quantity: item.quantity,
            previousStock: item.currentStock,
            currentStock: newStock,
            referenceType: 'INVOICE',
            referenceId: newInvoice.id,
            notes: `Sold via ${invoiceNumber}`,
          },
        });
      }
    }

    // C. Update Customer Balance & Customer Ledger for Invoice Creation
    const updatedCustBalance = Number(customer.currentBalance) + balanceAmount;
    await tx.customer.update({
      where: { id: customerId },
      data: { currentBalance: updatedCustBalance },
    });

    await tx.ledgerEntry.create({
      data: {
        businessId,
        partyType: PartyType.CUSTOMER,
        partyId: customer.id,
        entryType: EntryType.DEBIT,
        amount: roundedGrandTotal,
        balanceAfter: Number(customer.currentBalance) + roundedGrandTotal,
        referenceType: 'INVOICE',
        referenceId: newInvoice.id,
        description: `Invoice ${invoiceNumber} generated`,
      },
    });

    // D. If initial payment provided, record Payment & Ledger Entry
    if (paidAmount > 0) {
      await tx.payment.create({
        data: {
          businessId,
          type: PaymentType.RECEIVED,
          partyType: PartyType.CUSTOMER,
          customerId,
          invoiceId: newInvoice.id,
          amount: paidAmount,
          paymentMethod: (initialPayment?.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
          referenceNumber: initialPayment?.referenceNumber || null,
          notes: initialPayment?.notes || `Payment for ${invoiceNumber}`,
          status: 'COMPLETED',
        },
      });

      await tx.ledgerEntry.create({
        data: {
          businessId,
          partyType: PartyType.CUSTOMER,
          partyId: customer.id,
          entryType: EntryType.CREDIT,
          amount: paidAmount,
          balanceAfter: updatedCustBalance,
          referenceType: 'PAYMENT',
          referenceId: newInvoice.id,
          description: `Payment received for ${invoiceNumber}`,
        },
      });
    }

    // E. Create GST record for GSTR-1
    await tx.gSTRecord.create({
      data: {
        businessId,
        invoiceId: newInvoice.id,
        recordType: 'GSTR1',
        gstin: customer.gstin || 'B2C',
        periodMonth: today.getMonth() + 1,
        periodYear: today.getFullYear(),
        taxableValue: netTaxable,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        totalTax,
        status: 'RECORDED',
      },
    });

    return newInvoice;
  });

  return sendSuccess(res, 'Invoice created successfully', invoice, 201);
}

export async function getInvoices(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = (req.query.search as string) || '';
  const status = req.query.status as string;
  const customerId = req.query.customerId as string;

  const whereClause: any = { businessId };

  if (search) {
    whereClause.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { phone: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (status && status !== 'ALL') {
    whereClause.status = status;
  }

  if (customerId) {
    whereClause.customerId = customerId;
  }

  const [total, invoices] = await Promise.all([
    prisma.invoice.count({ where: whereClause }),
    prisma.invoice.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { invoiceDate: 'desc' },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        _count: {
          select: { items: true, payments: true },
        },
      },
    }),
  ]);

  return sendSuccess(res, 'Invoices retrieved successfully', {
    items: invoices,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function getInvoiceById(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;

  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId },
    include: {
      customer: true,
      business: true,
      items: {
        include: {
          product: true,
        },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
      },
    },
  });

  if (!invoice) {
    return sendError(res, 'Invoice not found', 'INVOICE_NOT_FOUND', 404);
  }

  return sendSuccess(res, 'Invoice details retrieved successfully', invoice);
}

export async function cancelInvoice(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;

  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  });

  if (!invoice) {
    return sendError(res, 'Invoice not found', 'INVOICE_NOT_FOUND', 404);
  }

  if (invoice.status === 'CANCELLED') {
    return sendError(res, 'Invoice is already cancelled', 'ALREADY_CANCELLED', 400);
  }

  await prisma.$transaction(async (tx) => {
    // 1. Mark invoice as CANCELLED
    await tx.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
    });

    // 2. Reverse stock movements
    for (const item of invoice.items) {
      if (!item.product.isService) {
        const restoredStock = Number(item.product.currentStock) + Number(item.quantity);
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: restoredStock },
        });

        await tx.stockMovement.create({
          data: {
            businessId,
            productId: item.productId,
            type: StockMovementType.SALE_RETURN,
            quantity: item.quantity,
            previousStock: item.product.currentStock,
            currentStock: restoredStock,
            referenceType: 'INVOICE_CANCEL',
            referenceId: invoice.id,
            notes: `Restored stock from cancelled invoice ${invoice.invoiceNumber}`,
          },
        });
      }
    }

    // 3. Revert customer balance: subtract unpaid balance
    const newCustBalance = Math.max(0, Number(invoice.customer.currentBalance) - Number(invoice.balanceAmount));
    await tx.customer.update({
      where: { id: invoice.customerId },
      data: { currentBalance: newCustBalance },
    });

    // 4. Record reversing ledger entry
    await tx.ledgerEntry.create({
      data: {
        businessId,
        partyType: PartyType.CUSTOMER,
        partyId: invoice.customerId,
        entryType: EntryType.CREDIT,
        amount: invoice.grandTotal,
        balanceAfter: newCustBalance,
        referenceType: 'INVOICE_CANCEL',
        referenceId: invoice.id,
        description: `Cancellation of invoice ${invoice.invoiceNumber}`,
      },
    });
  });

  return sendSuccess(res, 'Invoice cancelled and stock restored successfully');
}

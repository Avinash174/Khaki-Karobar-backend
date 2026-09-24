import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/api-response';
import { calculateItemGst } from '../../utils/gst-calculator';
import { PurchaseStatus, PaymentMethod, PaymentType, PartyType, EntryType, StockMovementType } from '@prisma/client';

export async function createPurchase(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const {
    supplierId,
    purchaseDate,
    dueDate,
    items,
    discountAmount,
    notes,
    initialPayment,
  } = req.body;

  if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
    return sendError(res, 'Supplier and at least one item are required', 'MISSING_FIELDS', 400);
  }

  const [business, supplier] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId } }),
    prisma.supplier.findFirst({ where: { id: supplierId, businessId } }),
  ]);

  if (!business || !supplier) {
    return sendError(res, 'Business or Supplier not found', 'NOT_FOUND', 404);
  }

  const isInterState = Boolean(
    business.stateCode &&
    supplier.stateCode &&
    business.stateCode !== supplier.stateCode
  );

  const today = new Date();
  const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.purchase.count({
    where: {
      businessId,
      purchaseDate: {
        gte: new Date(today.getFullYear(), today.getMonth(), 1),
      },
    },
  });
  const purchaseNumber = `PUR-${yearMonth}-${String(count + 1).padStart(4, '0')}`;

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
    const unitPrice = Number(item.unitPrice || product.purchasePrice);
    const gstRate = item.gstRate !== undefined ? Number(item.gstRate) : Number(product.gstRate);

    const calc = calculateItemGst(
      {
        quantity: qty,
        unitPrice,
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
      taxableAmount: calc.taxableAmount,
      gstRate,
      cgstAmount: calc.cgstAmount,
      sgstAmount: calc.sgstAmount,
      igstAmount: calc.igstAmount,
      totalAmount: calc.totalAmount,
    });
  }

  const discount = Number(discountAmount) || 0;
  const netTaxable = Math.max(0, totalTaxable - discount);
  const grandTotal = Number((netTaxable + totalTax).toFixed(2));

  const paidAmount = initialPayment?.amount ? Math.min(grandTotal, Number(initialPayment.amount)) : 0;
  const balanceAmount = grandTotal - paidAmount;

  let status: PurchaseStatus = PurchaseStatus.RECEIVED;
  if (balanceAmount === 0 && paidAmount > 0) {
    status = PurchaseStatus.PAID;
  } else if (paidAmount > 0 && balanceAmount > 0) {
    status = PurchaseStatus.PARTIALLY_PAID;
  } else {
    status = PurchaseStatus.PENDING;
  }

  const purchase = await prisma.$transaction(async (tx) => {
    // 1. Create Purchase
    const newPurchase = await tx.purchase.create({
      data: {
        businessId,
        supplierId,
        purchaseNumber,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        status,
        subtotal,
        discountAmount: discount,
        taxableAmount: netTaxable,
        cgstAmount: totalCgst,
        sgstAmount: totalSgst,
        igstAmount: totalIgst,
        totalTax,
        grandTotal,
        paidAmount,
        balanceAmount,
        notes: notes || 'Purchase entry',
        items: {
          create: processedItems.map((item) => ({
            productId: item.productId,
            description: item.description,
            hsnCode: item.hsnCode,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
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
        supplier: true,
      },
    });

    // 2. Increase stock and create stock movement
    for (const item of processedItems) {
      if (!item.isService) {
        const newStock = item.currentStock + item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: newStock,
            purchasePrice: item.unitPrice, // Update purchase cost
          },
        });

        await tx.stockMovement.create({
          data: {
            businessId,
            productId: item.productId,
            type: StockMovementType.PURCHASE,
            quantity: item.quantity,
            previousStock: item.currentStock,
            currentStock: newStock,
            referenceType: 'PURCHASE',
            referenceId: newPurchase.id,
            notes: `Purchased via bill ${purchaseNumber}`,
          },
        });
      }
    }

    // 3. Update Supplier Balance & Supplier Ledger
    const updatedSuppBalance = Number(supplier.currentBalance) + balanceAmount;
    await tx.supplier.update({
      where: { id: supplierId },
      data: { currentBalance: updatedSuppBalance },
    });

    await tx.ledgerEntry.create({
      data: {
        businessId,
        partyType: PartyType.SUPPLIER,
        partyId: supplier.id,
        entryType: EntryType.CREDIT,
        amount: grandTotal,
        balanceAfter: Number(supplier.currentBalance) + grandTotal,
        referenceType: 'PURCHASE',
        referenceId: newPurchase.id,
        description: `Purchase bill ${purchaseNumber} recorded`,
      },
    });

    // 4. Record payment made to supplier (if any)
    if (paidAmount > 0) {
      await tx.payment.create({
        data: {
          businessId,
          type: PaymentType.MADE,
          partyType: PartyType.SUPPLIER,
          supplierId,
          purchaseId: newPurchase.id,
          amount: paidAmount,
          paymentMethod: (initialPayment?.paymentMethod as PaymentMethod) || PaymentMethod.BANK_TRANSFER,
          referenceNumber: initialPayment?.referenceNumber || null,
          notes: initialPayment?.notes || `Payment for ${purchaseNumber}`,
          status: 'COMPLETED',
        },
      });

      await tx.ledgerEntry.create({
        data: {
          businessId,
          partyType: PartyType.SUPPLIER,
          partyId: supplier.id,
          entryType: EntryType.DEBIT,
          amount: paidAmount,
          balanceAfter: updatedSuppBalance,
          referenceType: 'PAYMENT',
          referenceId: newPurchase.id,
          description: `Payment made for ${purchaseNumber}`,
        },
      });
    }

    // 5. Create GST record for GSTR-2B / ITC
    await tx.gSTRecord.create({
      data: {
        businessId,
        purchaseId: newPurchase.id,
        recordType: 'GSTR2B',
        gstin: supplier.gstin || 'UNREGISTERED',
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

    return newPurchase;
  });

  return sendSuccess(res, 'Purchase recorded successfully', purchase, 201);
}

export async function getPurchases(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = (req.query.search as string) || '';

  const whereClause: any = { businessId };

  if (search) {
    whereClause.OR = [
      { purchaseNumber: { contains: search, mode: 'insensitive' } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [total, purchases] = await Promise.all([
    prisma.purchase.count({ where: whereClause }),
    prisma.purchase.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { purchaseDate: 'desc' },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, email: true },
        },
        _count: {
          select: { items: true, payments: true },
        },
      },
    }),
  ]);

  return sendSuccess(res, 'Purchases retrieved successfully', {
    items: purchases,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function getPurchaseById(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;

  const purchase = await prisma.purchase.findFirst({
    where: { id, businessId },
    include: {
      supplier: true,
      items: {
        include: { product: true },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
      },
    },
  });

  if (!purchase) {
    return sendError(res, 'Purchase not found', 'PURCHASE_NOT_FOUND', 404);
  }

  return sendSuccess(res, 'Purchase details retrieved successfully', purchase);
}

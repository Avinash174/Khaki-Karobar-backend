import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/api-response';

export async function getInventorySummary(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;

  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      currentStock: true,
      minStockAlert: true,
      purchasePrice: true,
      sellingPrice: true,
      unit: true,
    },
  });

  let totalItems = products.length;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalStockValue = 0;

  for (const p of products) {
    const stock = Number(p.currentStock);
    const minAlert = Number(p.minStockAlert);
    const cost = Number(p.purchasePrice);

    totalStockValue += stock * cost;

    if (stock <= 0) {
      outOfStockCount++;
      lowStockCount++;
    } else if (stock <= minAlert) {
      lowStockCount++;
    }
  }

  return sendSuccess(res, 'Inventory summary calculated', {
    totalItems,
    lowStockCount,
    outOfStockCount,
    totalStockValue: Number(totalStockValue.toFixed(2)),
  });
}

export async function getLowStockAlerts(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;

  const products = await prisma.product.findMany({
    where: {
      businessId,
      isActive: true,
      isService: false,
    },
    include: { category: true },
    orderBy: { currentStock: 'asc' },
  });

  const lowStock = products.filter(
    (p) => Number(p.currentStock) <= Number(p.minStockAlert)
  );

  return sendSuccess(res, 'Low stock alerts retrieved', lowStock);
}

export async function adjustStock(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const { productId, adjustmentType, quantity, notes } = req.body;
  // adjustmentType: 'ADD' | 'SUBTRACT' | 'SET'

  if (!productId || !adjustmentType || quantity === undefined) {
    return sendError(res, 'Product ID, adjustment type and quantity are required', 'MISSING_FIELDS', 400);
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, businessId },
  });

  if (!product) {
    return sendError(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
  }

  const qty = Number(quantity);
  const prevStock = Number(product.currentStock);
  let newStock = prevStock;

  if (adjustmentType === 'ADD') {
    newStock = prevStock + qty;
  } else if (adjustmentType === 'SUBTRACT') {
    newStock = Math.max(0, prevStock - qty);
  } else if (adjustmentType === 'SET') {
    newStock = Math.max(0, qty);
  } else {
    return sendError(res, 'Invalid adjustment type. Must be ADD, SUBTRACT, or SET', 'INVALID_TYPE', 400);
  }

  const movementDiff = Number((newStock - prevStock).toFixed(2));

  const result = await prisma.$transaction(async (tx) => {
    const updatedProd = await tx.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    const movement = await tx.stockMovement.create({
      data: {
        businessId,
        productId,
        type: 'ADJUSTMENT',
        quantity: Math.abs(movementDiff),
        previousStock: prevStock,
        currentStock: newStock,
        referenceType: 'MANUAL_ADJUSTMENT',
        notes: notes || `Manual stock adjustment (${adjustmentType})`,
      },
    });

    return { product: updatedProd, movement };
  });

  return sendSuccess(res, 'Stock adjusted successfully', result);
}

export async function getStockMovements(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const productId = req.query.productId as string;

  const whereClause: any = { businessId };
  if (productId) whereClause.productId = productId;

  const [total, movements] = await Promise.all([
    prisma.stockMovement.count({ where: whereClause }),
    prisma.stockMovement.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        product: {
          select: { id: true, name: true, sku: true, unit: true },
        },
      },
    }),
  ]);

  return sendSuccess(res, 'Stock movements retrieved successfully', {
    items: movements,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

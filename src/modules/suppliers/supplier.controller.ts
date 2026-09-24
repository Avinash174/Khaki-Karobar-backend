import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/api-response';

export async function createSupplier(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const { name, phone, email, gstin, address, city, state, stateCode, pincode, openingBalance } = req.body;

  if (!name || !phone) {
    return sendError(res, 'Name and phone are required', 'MISSING_FIELDS', 400);
  }

  const existing = await prisma.supplier.findFirst({
    where: { businessId, phone },
  });

  if (existing) {
    return sendError(res, 'A supplier with this phone number already exists in your business', 'SUPPLIER_EXISTS', 409);
  }

  const opening = Number(openingBalance) || 0;

  const supplier = await prisma.supplier.create({
    data: {
      businessId,
      name,
      phone,
      email: email || null,
      gstin: gstin || null,
      address: address || null,
      city: city || null,
      state: state || null,
      stateCode: stateCode || null,
      pincode: pincode || null,
      openingBalance: opening,
      currentBalance: opening, // What we owe to supplier
    },
  });

  if (opening > 0) {
    await prisma.ledgerEntry.create({
      data: {
        businessId,
        partyType: 'SUPPLIER',
        partyId: supplier.id,
        entryType: 'CREDIT',
        amount: opening,
        balanceAfter: opening,
        referenceType: 'OPENING_BALANCE',
        description: 'Supplier opening payable balance',
      },
    });
  }

  return sendSuccess(res, 'Supplier created successfully', supplier, 201);
}

export async function getSuppliers(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = (req.query.search as string) || '';

  const whereClause: any = {
    businessId,
    isActive: true,
  };

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { gstin: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, suppliers] = await Promise.all([
    prisma.supplier.count({ where: whereClause }),
    prisma.supplier.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { purchases: true, payments: true },
        },
      },
    }),
  ]);

  return sendSuccess(res, 'Suppliers retrieved successfully', {
    items: suppliers,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function getSupplierById(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;

  const supplier = await prisma.supplier.findFirst({
    where: { id, businessId },
    include: {
      purchases: {
        orderBy: { purchaseDate: 'desc' },
        take: 10,
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        take: 10,
      },
    },
  });

  if (!supplier) {
    return sendError(res, 'Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
  }

  return sendSuccess(res, 'Supplier details retrieved successfully', supplier);
}

export async function updateSupplier(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;
  const { name, phone, email, gstin, address, city, state, stateCode, pincode } = req.body;

  const existing = await prisma.supplier.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    return sendError(res, 'Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
  }

  const updated = await prisma.supplier.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(phone && { phone }),
      ...(email !== undefined && { email }),
      ...(gstin !== undefined && { gstin }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(stateCode !== undefined && { stateCode }),
      ...(pincode !== undefined && { pincode }),
    },
  });

  return sendSuccess(res, 'Supplier updated successfully', updated);
}

export async function deleteSupplier(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;

  const existing = await prisma.supplier.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    return sendError(res, 'Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
  }

  await prisma.supplier.update({
    where: { id },
    data: { isActive: false },
  });

  return sendSuccess(res, 'Supplier deleted successfully');
}

export async function getSupplierLedger(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;

  const supplier = await prisma.supplier.findFirst({
    where: { id, businessId },
  });

  if (!supplier) {
    return sendError(res, 'Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
  }

  const ledgerEntries = await prisma.ledgerEntry.findMany({
    where: {
      businessId,
      partyType: 'SUPPLIER',
      partyId: id,
    },
    orderBy: { date: 'asc' },
  });

  return sendSuccess(res, 'Supplier ledger retrieved successfully', {
    supplier: {
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      currentBalance: supplier.currentBalance,
    },
    entries: ledgerEntries,
  });
}

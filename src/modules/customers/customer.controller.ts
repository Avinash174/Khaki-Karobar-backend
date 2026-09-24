import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/api-response';

export async function createCustomer(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const { name, phone, email, gstin, address, city, state, stateCode, pincode, creditLimit, openingBalance } = req.body;

  if (!name || !phone) {
    return sendError(res, 'Name and phone are required', 'MISSING_FIELDS', 400);
  }

  const existing = await prisma.customer.findFirst({
    where: { businessId, phone },
  });

  if (existing) {
    return sendError(res, 'A customer with this phone number already exists in your business', 'CUSTOMER_EXISTS', 409);
  }

  const opening = Number(openingBalance) || 0;

  const customer = await prisma.customer.create({
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
      creditLimit: Number(creditLimit) || 0,
      openingBalance: opening,
      currentBalance: opening, // Starts with opening balance
    },
  });

  if (opening > 0) {
    await prisma.ledgerEntry.create({
      data: {
        businessId,
        partyType: 'CUSTOMER',
        partyId: customer.id,
        entryType: 'DEBIT',
        amount: opening,
        balanceAfter: opening,
        referenceType: 'OPENING_BALANCE',
        description: 'Opening balance',
      },
    });
  }

  return sendSuccess(res, 'Customer created successfully', customer, 201);
}

export async function getCustomers(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = (req.query.search as string) || '';
  const filter = (req.query.filter as string) || 'ALL'; // ALL, DUE, ZERO

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

  if (filter === 'DUE') {
    whereClause.currentBalance = { gt: 0 };
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where: whereClause }),
    prisma.customer.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { invoices: true, payments: true },
        },
      },
    }),
  ]);

  return sendSuccess(res, 'Customers retrieved successfully', {
    items: customers,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function getCustomerById(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;

  const customer = await prisma.customer.findFirst({
    where: { id, businessId },
    include: {
      invoices: {
        orderBy: { invoiceDate: 'desc' },
        take: 10,
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        take: 10,
      },
    },
  });

  if (!customer) {
    return sendError(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
  }

  return sendSuccess(res, 'Customer details retrieved successfully', customer);
}

export async function updateCustomer(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;
  const { name, phone, email, gstin, address, city, state, stateCode, pincode, creditLimit } = req.body;

  const existing = await prisma.customer.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    return sendError(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
  }

  const updated = await prisma.customer.update({
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
      ...(creditLimit !== undefined && { creditLimit: Number(creditLimit) }),
    },
  });

  return sendSuccess(res, 'Customer updated successfully', updated);
}

export async function deleteCustomer(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;

  const existing = await prisma.customer.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    return sendError(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
  }

  // Soft delete
  await prisma.customer.update({
    where: { id },
    data: { isActive: false },
  });

  return sendSuccess(res, 'Customer deleted successfully');
}

export async function getCustomerLedger(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;

  const customer = await prisma.customer.findFirst({
    where: { id, businessId },
  });

  if (!customer) {
    return sendError(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
  }

  const ledgerEntries = await prisma.ledgerEntry.findMany({
    where: {
      businessId,
      partyType: 'CUSTOMER',
      partyId: id,
    },
    orderBy: { date: 'asc' },
  });

  return sendSuccess(res, 'Customer ledger retrieved successfully', {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      currentBalance: customer.currentBalance,
    },
    entries: ledgerEntries,
  });
}

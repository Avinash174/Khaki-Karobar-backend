import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/api-response';
import { PaymentMethod, PartyType, EntryType } from '@prisma/client';

export async function createExpense(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const {
    categoryId,
    title,
    amount,
    paymentMethod,
    paymentDate,
    referenceNumber,
    recipient,
    notes,
    isGstDeductible,
    gstRate,
  } = req.body;

  const expAmount = Number(amount);
  if (!categoryId || !title || !expAmount || expAmount <= 0) {
    return sendError(res, 'Category, title, and valid amount are required', 'MISSING_FIELDS', 400);
  }

  let gstAmount = 0;
  if (isGstDeductible && gstRate) {
    gstAmount = Number(((expAmount * Number(gstRate)) / (100 + Number(gstRate))).toFixed(2));
  }

  const expense = await prisma.$transaction(async (tx) => {
    const exp = await tx.expense.create({
      data: {
        businessId,
        categoryId,
        title,
        amount: expAmount,
        paymentMethod: (paymentMethod as PaymentMethod) || PaymentMethod.CASH,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        referenceNumber: referenceNumber || null,
        recipient: recipient || null,
        notes: notes || null,
        isGstDeductible: Boolean(isGstDeductible),
        gstRate: gstRate ? Number(gstRate) : 0,
        gstAmount,
      },
      include: { category: true },
    });

    // Ledger Entry for Expense
    await tx.ledgerEntry.create({
      data: {
        businessId,
        partyType: PartyType.EXPENSE,
        date: exp.paymentDate,
        entryType: EntryType.DEBIT,
        amount: expAmount,
        referenceType: 'EXPENSE',
        referenceId: exp.id,
        description: `Expense: ${title} (${exp.category.name})`,
      },
    });

    return exp;
  });

  return sendSuccess(res, 'Expense recorded successfully', expense, 201);
}

export async function getExpenses(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const categoryId = req.query.categoryId as string;

  const whereClause: any = { businessId };
  if (categoryId) whereClause.categoryId = categoryId;

  const [total, expenses] = await Promise.all([
    prisma.expense.count({ where: whereClause }),
    prisma.expense.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { paymentDate: 'desc' },
      include: { category: true },
    }),
  ]);

  return sendSuccess(res, 'Expenses retrieved successfully', {
    items: expenses,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function getExpenseCategories(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const categories = await prisma.expenseCategory.findMany({
    where: { businessId },
    include: { _count: { select: { expenses: true } } },
    orderBy: { name: 'asc' },
  });
  return sendSuccess(res, 'Expense categories retrieved successfully', categories);
}

export async function createExpenseCategory(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const { name } = req.body;
  if (!name) return sendError(res, 'Category name is required', 'MISSING_FIELDS', 400);

  const cat = await prisma.expenseCategory.create({
    data: { businessId, name },
  });
  return sendSuccess(res, 'Expense category created successfully', cat, 201);
}

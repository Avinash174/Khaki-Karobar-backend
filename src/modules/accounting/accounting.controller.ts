import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess } from '../../utils/api-response';

export async function getDayBook(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const targetDateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];

  const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);

  const [invoices, purchases, payments, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { businessId, invoiceDate: { gte: startOfDay, lte: endOfDay } },
      include: { customer: { select: { name: true } } },
    }),
    prisma.purchase.findMany({
      where: { businessId, purchaseDate: { gte: startOfDay, lte: endOfDay } },
      include: { supplier: { select: { name: true } } },
    }),
    prisma.payment.findMany({
      where: { businessId, paymentDate: { gte: startOfDay, lte: endOfDay } },
      include: {
        customer: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    }),
    prisma.expense.findMany({
      where: { businessId, paymentDate: { gte: startOfDay, lte: endOfDay } },
      include: { category: true },
    }),
  ]);

  return sendSuccess(res, 'Day book retrieved successfully', {
    date: targetDateStr,
    invoices,
    purchases,
    payments,
    expenses,
  });
}

export async function getCashBook(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;

  const cashPayments = await prisma.payment.findMany({
    where: { businessId, paymentMethod: 'CASH' },
    orderBy: { paymentDate: 'desc' },
    take: 100,
    include: {
      customer: { select: { name: true } },
      supplier: { select: { name: true } },
    },
  });

  const cashExpenses = await prisma.expense.findMany({
    where: { businessId, paymentMethod: 'CASH' },
    orderBy: { paymentDate: 'desc' },
    take: 100,
    include: { category: true },
  });

  let totalCashIn = 0;
  let totalCashOut = 0;

  for (const p of cashPayments) {
    if (p.type === 'RECEIVED') totalCashIn += Number(p.amount);
    if (p.type === 'MADE') totalCashOut += Number(p.amount);
  }

  for (const e of cashExpenses) {
    totalCashOut += Number(e.amount);
  }

  return sendSuccess(res, 'Cash book calculated', {
    totalCashIn: Number(totalCashIn.toFixed(2)),
    totalCashOut: Number(totalCashOut.toFixed(2)),
    netCashBalance: Number((totalCashIn - totalCashOut).toFixed(2)),
    recentTransactions: [
      ...cashPayments.map((p) => ({
        id: p.id,
        date: p.paymentDate,
        type: p.type === 'RECEIVED' ? 'IN' : 'OUT',
        amount: Number(p.amount),
        party: p.customer?.name || p.supplier?.name || 'Party',
        category: 'PAYMENT',
      })),
      ...cashExpenses.map((e) => ({
        id: e.id,
        date: e.paymentDate,
        type: 'OUT',
        amount: Number(e.amount),
        party: e.recipient || 'Expense',
        category: e.category.name,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  });
}

export async function getBankBook(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;

  const bankPayments = await prisma.payment.findMany({
    where: {
      businessId,
      paymentMethod: { in: ['BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE'] },
    },
    orderBy: { paymentDate: 'desc' },
    take: 100,
    include: {
      customer: { select: { name: true } },
      supplier: { select: { name: true } },
    },
  });

  const bankExpenses = await prisma.expense.findMany({
    where: {
      businessId,
      paymentMethod: { in: ['BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE'] },
    },
    orderBy: { paymentDate: 'desc' },
    take: 100,
    include: { category: true },
  });

  let totalBankIn = 0;
  let totalBankOut = 0;

  for (const p of bankPayments) {
    if (p.type === 'RECEIVED') totalBankIn += Number(p.amount);
    if (p.type === 'MADE') totalBankOut += Number(p.amount);
  }

  for (const e of bankExpenses) {
    totalBankOut += Number(e.amount);
  }

  return sendSuccess(res, 'Bank book calculated', {
    totalBankIn: Number(totalBankIn.toFixed(2)),
    totalBankOut: Number(totalBankOut.toFixed(2)),
    netBankBalance: Number((totalBankIn - totalBankOut).toFixed(2)),
    recentTransactions: [
      ...bankPayments.map((p) => ({
        id: p.id,
        date: p.paymentDate,
        type: p.type === 'RECEIVED' ? 'IN' : 'OUT',
        amount: Number(p.amount),
        party: p.customer?.name || p.supplier?.name || 'Party',
        paymentMethod: p.paymentMethod,
        ref: p.referenceNumber,
      })),
      ...bankExpenses.map((e) => ({
        id: e.id,
        date: e.paymentDate,
        type: 'OUT',
        amount: Number(e.amount),
        party: e.recipient || 'Expense',
        paymentMethod: e.paymentMethod,
        ref: e.referenceNumber,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  });
}

export async function getProfitAndLoss(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;

  // 1. Total Revenue from Invoices (not cancelled)
  const invoices = await prisma.invoice.findMany({
    where: { businessId, status: { not: 'CANCELLED' } },
    select: { taxableAmount: true, totalTax: true, grandTotal: true },
  });

  const totalSalesRevenue = invoices.reduce((sum, inv) => sum + Number(inv.taxableAmount), 0);

  // 2. Cost of Purchases
  const purchases = await prisma.purchase.findMany({
    where: { businessId, status: { not: 'CANCELLED' } },
    select: { taxableAmount: true, grandTotal: true },
  });

  const totalCostOfGoods = purchases.reduce((sum, pur) => sum + Number(pur.taxableAmount), 0);

  // 3. Operating Expenses
  const expenses = await prisma.expense.findMany({
    where: { businessId },
    select: { amount: true },
  });

  const totalOperatingExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  const grossProfit = totalSalesRevenue - totalCostOfGoods;
  const netProfit = grossProfit - totalOperatingExpenses;

  return sendSuccess(res, 'Profit and Loss calculated from active ledger data', {
    revenue: {
      salesTaxable: Number(totalSalesRevenue.toFixed(2)),
    },
    costOfSales: {
      purchasesTaxable: Number(totalCostOfGoods.toFixed(2)),
    },
    grossProfit: Number(grossProfit.toFixed(2)),
    operatingExpenses: Number(totalOperatingExpenses.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
  });
}

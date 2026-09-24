import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess } from '../../utils/api-response';

export async function getDashboardOverview(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // 1. Today's Sales & Purchases
  const [todayInvoices, todayPurchases] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        businessId,
        status: { not: 'CANCELLED' },
        invoiceDate: { gte: startOfToday, lte: endOfToday },
      },
      select: { grandTotal: true },
    }),
    prisma.purchase.findMany({
      where: {
        businessId,
        status: { not: 'CANCELLED' },
        purchaseDate: { gte: startOfToday, lte: endOfToday },
      },
      select: { grandTotal: true },
    }),
  ]);

  const todaySales = todayInvoices.reduce((acc, curr) => acc + Number(curr.grandTotal), 0);
  const todayPurchase = todayPurchases.reduce((acc, curr) => acc + Number(curr.grandTotal), 0);

  // 2. Receivables & Payables
  const [customers, suppliers] = await Promise.all([
    prisma.customer.findMany({
      where: { businessId, isActive: true },
      select: { currentBalance: true },
    }),
    prisma.supplier.findMany({
      where: { businessId, isActive: true },
      select: { currentBalance: true },
    }),
  ]);

  const totalReceivables = customers.reduce((acc, c) => acc + Number(c.currentBalance), 0);
  const totalPayables = suppliers.reduce((acc, s) => acc + Number(s.currentBalance), 0);

  // 3. Cash balance
  const [paymentsIn, paymentsOut, expenses] = await Promise.all([
    prisma.payment.aggregate({
      where: { businessId, type: 'RECEIVED', paymentMethod: 'CASH' },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { businessId, type: 'MADE', paymentMethod: 'CASH' },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { businessId, paymentMethod: 'CASH' },
      _sum: { amount: true },
    }),
  ]);

  const cashIn = Number(paymentsIn._sum.amount || 0);
  const cashOut = Number(paymentsOut._sum.amount || 0) + Number(expenses._sum.amount || 0);
  const cashBalance = Number((cashIn - cashOut).toFixed(2));

  // 4. Products count & Low stock alert count
  const allProducts = await prisma.product.findMany({
    where: { businessId, isActive: true, isService: false },
    select: { currentStock: true, minStockAlert: true },
  });

  const lowStockCount = allProducts.filter(
    (p) => Number(p.currentStock) <= Number(p.minStockAlert)
  ).length;

  // 5. Recent 5 Invoices
  const recentInvoices = await prisma.invoice.findMany({
    where: { businessId },
    orderBy: { invoiceDate: 'desc' },
    take: 5,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  // 6. Recent 5 Transactions (Payments)
  const recentTransactions = await prisma.payment.findMany({
    where: { businessId },
    orderBy: { paymentDate: 'desc' },
    take: 5,
    include: {
      customer: { select: { name: true } },
      supplier: { select: { name: true } },
    },
  });

  // 7. Last 7 Days Sales Trend
  const last7Days: { date: string; sales: number; purchases: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const s = new Date(`${dateStr}T00:00:00.000Z`);
    const e = new Date(`${dateStr}T23:59:59.999Z`);

    const [daySales, dayPurchases] = await Promise.all([
      prisma.invoice.aggregate({
        where: { businessId, status: { not: 'CANCELLED' }, invoiceDate: { gte: s, lte: e } },
        _sum: { grandTotal: true },
      }),
      prisma.purchase.aggregate({
        where: { businessId, status: { not: 'CANCELLED' }, purchaseDate: { gte: s, lte: e } },
        _sum: { grandTotal: true },
      }),
    ]);

    last7Days.push({
      date: dateStr,
      sales: Number(daySales._sum.grandTotal || 0),
      purchases: Number(dayPurchases._sum.grandTotal || 0),
    });
  }

  return sendSuccess(res, 'Dashboard metrics retrieved', {
    todaySales: Number(todaySales.toFixed(2)),
    todayPurchase: Number(todayPurchase.toFixed(2)),
    totalReceivables: Number(totalReceivables.toFixed(2)),
    totalPayables: Number(totalPayables.toFixed(2)),
    cashBalance,
    totalProductsCount: allProducts.length,
    lowStockCount,
    recentInvoices,
    recentTransactions,
    trend: last7Days,
  });
}

export async function getSalesReport(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const fromDate = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = req.query.to ? new Date(req.query.to as string) : new Date();

  const invoices = await prisma.invoice.findMany({
    where: {
      businessId,
      status: { not: 'CANCELLED' },
      invoiceDate: { gte: fromDate, lte: toDate },
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { invoiceDate: 'desc' },
  });

  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.grandTotal), 0);
  const totalTaxable = invoices.reduce((sum, i) => sum + Number(i.taxableAmount), 0);
  const totalTax = invoices.reduce((sum, i) => sum + Number(i.totalTax), 0);
  const totalReceived = invoices.reduce((sum, i) => sum + Number(i.paidAmount), 0);
  const totalPending = invoices.reduce((sum, i) => sum + Number(i.balanceAmount), 0);

  return sendSuccess(res, 'Sales report retrieved', {
    summary: {
      invoiceCount: invoices.length,
      totalInvoiced: Number(totalInvoiced.toFixed(2)),
      totalTaxable: Number(totalTaxable.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalReceived: Number(totalReceived.toFixed(2)),
      totalPending: Number(totalPending.toFixed(2)),
    },
    invoices,
  });
}

export async function getOutstandingReport(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;

  const [debtors, creditors] = await Promise.all([
    prisma.customer.findMany({
      where: { businessId, isActive: true, currentBalance: { gt: 0 } },
      orderBy: { currentBalance: 'desc' },
      select: { id: true, name: true, phone: true, currentBalance: true },
    }),
    prisma.supplier.findMany({
      where: { businessId, isActive: true, currentBalance: { gt: 0 } },
      orderBy: { currentBalance: 'desc' },
      select: { id: true, name: true, phone: true, currentBalance: true },
    }),
  ]);

  const totalReceivables = debtors.reduce((sum, d) => sum + Number(d.currentBalance), 0);
  const totalPayables = creditors.reduce((sum, c) => sum + Number(c.currentBalance), 0);

  return sendSuccess(res, 'Outstanding report retrieved', {
    receivables: {
      total: Number(totalReceivables.toFixed(2)),
      count: debtors.length,
      items: debtors,
    },
    payables: {
      total: Number(totalPayables.toFixed(2)),
      count: creditors.length,
      items: creditors,
    },
  });
}

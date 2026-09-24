import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess } from '../../utils/api-response';

export async function getAdminDashboard(req: AuthenticatedRequest, res: Response): Promise<any> {
  const [
    totalBusinesses,
    activeBusinesses,
    totalUsers,
    totalCustomers,
    totalSuppliers,
    totalProducts,
    allInvoices,
    allPurchases,
    debtors,
    allProductsWithStock,
    recentInvoices,
    recentPayments,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.product.count(),
    prisma.invoice.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { grandTotal: true, taxableAmount: true, totalTax: true, paidAmount: true, balanceAmount: true },
    }),
    prisma.purchase.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { grandTotal: true, taxableAmount: true, paidAmount: true, balanceAmount: true },
    }),
    prisma.customer.findMany({
      where: { currentBalance: { gt: 0 } },
      select: { currentBalance: true },
    }),
    prisma.product.findMany({
      where: { isActive: true, isService: false },
      select: { currentStock: true, minStockAlert: true },
    }),
    prisma.invoice.findMany({
      take: 6,
      orderBy: { invoiceDate: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
        business: { select: { name: true } },
      },
    }),
    prisma.payment.findMany({
      take: 6,
      orderBy: { paymentDate: 'desc' },
      include: {
        customer: { select: { name: true } },
        supplier: { select: { name: true } },
        business: { select: { name: true } },
      },
    }),
  ]);

  const totalSales = allInvoices.reduce((sum, i) => sum + Number(i.grandTotal), 0);
  const totalPurchases = allPurchases.reduce((sum, p) => sum + Number(p.grandTotal), 0);
  const totalRevenue = allInvoices.reduce((sum, i) => sum + Number(i.paidAmount), 0);
  const outstandingPayments = debtors.reduce((sum, d) => sum + Number(d.currentBalance), 0);
  const lowStockCount = allProductsWithStock.filter(
    (p) => Number(p.currentStock) <= Number(p.minStockAlert)
  ).length;

  // Monthly 6-month graph trend
  const monthlyTrends: { month: string; sales: number; purchases: number }[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endM = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const [salesSum, purchaseSum] = await Promise.all([
      prisma.invoice.aggregate({
        where: { status: { not: 'CANCELLED' }, invoiceDate: { gte: d, lte: endM } },
        _sum: { grandTotal: true },
      }),
      prisma.purchase.aggregate({
        where: { status: { not: 'CANCELLED' }, purchaseDate: { gte: d, lte: endM } },
        _sum: { grandTotal: true },
      }),
    ]);

    monthlyTrends.push({
      month: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
      sales: Number(salesSum._sum.grandTotal || 0),
      purchases: Number(purchaseSum._sum.grandTotal || 0),
    });
  }

  return sendSuccess(res, 'Admin dashboard metrics retrieved successfully', {
    overview: {
      totalBusinesses,
      activeBusinesses,
      totalUsers,
      totalCustomers,
      totalSuppliers,
      totalProducts,
      totalSales: Number(totalSales.toFixed(2)),
      totalPurchases: Number(totalPurchases.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      outstandingPayments: Number(outstandingPayments.toFixed(2)),
      lowStockProducts: lowStockCount,
    },
    recentInvoices,
    recentTransactions: recentPayments,
    chartData: monthlyTrends,
  });
}

export async function getAdminUsers(req: AuthenticatedRequest, res: Response): Promise<any> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      memberships: {
        include: {
          business: { select: { id: true, name: true } },
        },
      },
    },
  });

  return sendSuccess(res, 'Platform users retrieved', users);
}

export async function getAdminBusinesses(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          members: true,
          customers: true,
          suppliers: true,
          products: true,
          invoices: true,
        },
      },
    },
  });

  return sendSuccess(res, 'Platform businesses retrieved', businesses);
}

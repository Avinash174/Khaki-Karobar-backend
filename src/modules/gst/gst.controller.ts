import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess } from '../../utils/api-response';

export async function getGstr1Summary(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
  const year = parseInt(req.query.year as string) || new Date().getFullYear();

  const invoices = await prisma.invoice.findMany({
    where: {
      businessId,
      status: { not: 'CANCELLED' },
      invoiceDate: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
    },
    include: {
      customer: true,
      items: true,
    },
  });

  let b2bTaxable = 0;
  let b2bCgst = 0;
  let b2bSgst = 0;
  let b2bIgst = 0;
  let b2bTotalTax = 0;

  let b2cTaxable = 0;
  let b2cCgst = 0;
  let b2cSgst = 0;
  let b2cIgst = 0;
  let b2cTotalTax = 0;

  const b2bInvoices = [];
  const b2cInvoices = [];

  for (const inv of invoices) {
    const isB2B = Boolean(inv.customer.gstin);
    const taxable = Number(inv.taxableAmount);
    const cgst = Number(inv.cgstAmount);
    const sgst = Number(inv.sgstAmount);
    const igst = Number(inv.igstAmount);
    const tax = Number(inv.totalTax);

    if (isB2B) {
      b2bTaxable += taxable;
      b2bCgst += cgst;
      b2bSgst += sgst;
      b2bIgst += igst;
      b2bTotalTax += tax;
      b2bInvoices.push(inv);
    } else {
      b2cTaxable += taxable;
      b2cCgst += cgst;
      b2cSgst += sgst;
      b2cIgst += igst;
      b2cTotalTax += tax;
      b2cInvoices.push(inv);
    }
  }

  return sendSuccess(res, 'GSTR-1 summary calculated', {
    period: { month, year },
    b2b: {
      count: b2bInvoices.length,
      taxableValue: Number(b2bTaxable.toFixed(2)),
      cgst: Number(b2bCgst.toFixed(2)),
      sgst: Number(b2bSgst.toFixed(2)),
      igst: Number(b2bIgst.toFixed(2)),
      totalTax: Number(b2bTotalTax.toFixed(2)),
      invoices: b2bInvoices,
    },
    b2c: {
      count: b2cInvoices.length,
      taxableValue: Number(b2cTaxable.toFixed(2)),
      cgst: Number(b2cCgst.toFixed(2)),
      sgst: Number(b2cSgst.toFixed(2)),
      igst: Number(b2cIgst.toFixed(2)),
      totalTax: Number(b2cTotalTax.toFixed(2)),
    },
    totalOutwardSupplies: {
      taxableValue: Number((b2bTaxable + b2cTaxable).toFixed(2)),
      totalTax: Number((b2bTotalTax + b2cTotalTax).toFixed(2)),
    },
  });
}

export async function getGstr3bSummary(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
  const year = parseInt(req.query.year as string) || new Date().getFullYear();

  // Outward tax liability (Sales)
  const sales = await prisma.invoice.findMany({
    where: {
      businessId,
      status: { not: 'CANCELLED' },
      invoiceDate: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
    },
  });

  const outputCgst = sales.reduce((sum, s) => sum + Number(s.cgstAmount), 0);
  const outputSgst = sales.reduce((sum, s) => sum + Number(s.sgstAmount), 0);
  const outputIgst = sales.reduce((sum, s) => sum + Number(s.igstAmount), 0);
  const outputTotal = sales.reduce((sum, s) => sum + Number(s.totalTax), 0);

  // Eligible ITC (Purchases)
  const purchases = await prisma.purchase.findMany({
    where: {
      businessId,
      status: { not: 'CANCELLED' },
      purchaseDate: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
    },
  });

  const itcCgst = purchases.reduce((sum, p) => sum + Number(p.cgstAmount), 0);
  const itcSgst = purchases.reduce((sum, p) => sum + Number(p.sgstAmount), 0);
  const itcIgst = purchases.reduce((sum, p) => sum + Number(p.igstAmount), 0);
  const itcTotal = purchases.reduce((sum, p) => sum + Number(p.totalTax), 0);

  // Net payable
  const netCgst = Math.max(0, outputCgst - itcCgst);
  const netSgst = Math.max(0, outputSgst - itcSgst);
  const netIgst = Math.max(0, outputIgst - itcIgst);
  const netTaxPayable = Number((netCgst + netSgst + netIgst).toFixed(2));

  return sendSuccess(res, 'GSTR-3B summary calculated', {
    period: { month, year },
    outwardTaxLiability: {
      cgst: Number(outputCgst.toFixed(2)),
      sgst: Number(outputSgst.toFixed(2)),
      igst: Number(outputIgst.toFixed(2)),
      total: Number(outputTotal.toFixed(2)),
    },
    eligibleItc: {
      cgst: Number(itcCgst.toFixed(2)),
      sgst: Number(itcSgst.toFixed(2)),
      igst: Number(itcIgst.toFixed(2)),
      total: Number(itcTotal.toFixed(2)),
    },
    netGstPayable: {
      cgst: Number(netCgst.toFixed(2)),
      sgst: Number(netSgst.toFixed(2)),
      igst: Number(netIgst.toFixed(2)),
      total: netTaxPayable,
    },
  });
}

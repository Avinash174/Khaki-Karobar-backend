export interface GstCalculationItem {
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  gstRate: number; // e.g. 18 for 18%
}

export interface GstCalculationResult {
  taxableAmount: number;
  discountAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export function calculateItemGst(
  item: GstCalculationItem,
  isInterState: boolean
): GstCalculationResult {
  const lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
  let discount = 0;

  if (item.discountPercent && item.discountPercent > 0) {
    discount = Number(((lineTotal * item.discountPercent) / 100).toFixed(2));
  } else if (item.discountAmount && item.discountAmount > 0) {
    discount = Number(item.discountAmount.toFixed(2));
  }

  const taxableAmount = Math.max(0, Number((lineTotal - discount).toFixed(2)));
  const totalTax = Number(((taxableAmount * item.gstRate) / 100).toFixed(2));

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = totalTax;
  } else {
    cgstAmount = Number((totalTax / 2).toFixed(2));
    sgstAmount = Number((totalTax - cgstAmount).toFixed(2));
  }

  const totalAmount = Number((taxableAmount + totalTax).toFixed(2));

  return {
    taxableAmount,
    discountAmount: discount,
    gstRate: item.gstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    totalAmount,
  };
}

import { PrismaClient, GlobalRole, BusinessRole, PartyType, EntryType, InvoiceType, InvoiceStatus, PaymentType, PaymentMethod, StockMovementType, PurchaseStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Khaki Karobari...');

  // 1. Clean existing test data (if any)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.gSTRecord.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.businessMember.deleteMany();
  await prisma.business.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.otpVerification.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const superAdminPassword = await bcrypt.hash('AdminPassword@123', 10);
  const ownerPassword = await bcrypt.hash('OwnerPassword@123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      phone: '9876543210',
      email: 'admin@khaki.com',
      passwordHash: superAdminPassword,
      name: 'Avinash Sanjay Magar',
      role: GlobalRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  const businessOwner = await prisma.user.create({
    data: {
      phone: '9876543211',
      email: 'owner@khaki.com',
      passwordHash: ownerPassword,
      name: 'Rajesh Sharma',
      role: GlobalRole.USER,
      isActive: true,
    },
  });

  console.log('✅ Users created: Super Admin & Business Owner');

  // 3. Create Business
  const business = await prisma.business.create({
    data: {
      name: 'Khaki General Store & Electronics',
      legalName: 'Khaki KrypTech Retail LLP',
      gstin: '27AAPFU0931P1ZV',
      pan: 'AAPFU0931P',
      email: 'store@khaki.com',
      phone: '9876543211',
      address: 'Shop 14, Commercial Complex, MG Road',
      city: 'Pune',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '411001',
      currency: 'INR',
      financialYearStart: new Date('2026-04-01'),
      isActive: true,
    },
  });

  // 4. Create Business Memberships
  await prisma.businessMember.createMany({
    data: [
      {
        businessId: business.id,
        userId: superAdmin.id,
        role: BusinessRole.OWNER,
        permissions: ['ALL'],
      },
      {
        businessId: business.id,
        userId: businessOwner.id,
        role: BusinessRole.ADMIN,
        permissions: ['ALL'],
      },
    ],
  });

  console.log('✅ Business created & Members assigned');

  // 5. Create Categories & Brands
  const catElectronics = await prisma.category.create({
    data: { businessId: business.id, name: 'Electronics & POS', description: 'Hardware, Scanners, POS devices' },
  });
  const catStationery = await prisma.category.create({
    data: { businessId: business.id, name: 'Stationery', description: 'Office and paper supplies' },
  });
  const catFMCG = await prisma.category.create({
    data: { businessId: business.id, name: 'Daily Essentials', description: 'Packaged food & commodities' },
  });

  const brandKhaki = await prisma.brand.create({
    data: { businessId: business.id, name: 'Khaki KrypTech' },
  });
  const brandSamsung = await prisma.brand.create({
    data: { businessId: business.id, name: 'Samsung' },
  });
  const brandTata = await prisma.brand.create({
    data: { businessId: business.id, name: 'Tata' },
  });

  // 6. Create Products
  const p1 = await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: catElectronics.id,
      brandId: brandKhaki.id,
      name: 'Khaki Wireless 2D Barcode Scanner',
      sku: 'KHK-SCN-001',
      barcode: '8901234567890',
      description: 'High precision wireless laser scanner with USB receiver',
      unit: 'PCS',
      hsnCode: '8471',
      purchasePrice: 1800.00,
      sellingPrice: 2500.00,
      mrp: 2999.00,
      gstRate: 18.00,
      minStockAlert: 5,
      currentStock: 25,
      isActive: true,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: catElectronics.id,
      brandId: brandKhaki.id,
      name: 'Khaki Thermal Receipt Printer 80mm',
      sku: 'KHK-PRN-002',
      barcode: '8901234567891',
      description: 'High speed direct thermal bill printer (USB + Bluetooth)',
      unit: 'PCS',
      hsnCode: '8443',
      purchasePrice: 2800.00,
      sellingPrice: 3800.00,
      mrp: 4500.00,
      gstRate: 18.00,
      minStockAlert: 3,
      currentStock: 15,
      isActive: true,
    },
  });

  const p3 = await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: catFMCG.id,
      brandId: brandTata.id,
      name: 'Tata Tea Gold Premium 500g',
      sku: 'TAT-TEA-500',
      barcode: '8901234567892',
      description: 'Rich aroma CTC tea blend',
      unit: 'PACK',
      hsnCode: '0902',
      purchasePrice: 240.00,
      sellingPrice: 310.00,
      mrp: 330.00,
      gstRate: 5.00,
      minStockAlert: 10,
      currentStock: 48,
      isActive: true,
    },
  });

  const p4 = await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: catStationery.id,
      name: 'Thermal Billing Rolls 80mm (Pack of 10)',
      sku: 'ROL-80MM-10',
      barcode: '8901234567893',
      description: 'BPA-free thermal paper rolls for POS printers',
      unit: 'PACK',
      hsnCode: '4802',
      purchasePrice: 220.00,
      sellingPrice: 350.00,
      mrp: 400.00,
      gstRate: 12.00,
      minStockAlert: 10,
      currentStock: 30,
      isActive: true,
    },
  });

  // Record Initial Stock Movements
  for (const prod of [p1, p2, p3, p4]) {
    await prisma.stockMovement.create({
      data: {
        businessId: business.id,
        productId: prod.id,
        type: StockMovementType.INITIAL,
        quantity: prod.currentStock,
        previousStock: 0,
        currentStock: prod.currentStock,
        referenceType: 'INITIAL_STOCK',
        notes: 'Opening stock entry',
      },
    });
  }

  console.log('✅ Products & Initial Stock movements created');

  // 7. Create Customers
  const customerB2B = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: 'Apex Supermarket Pvt Ltd',
      phone: '9822011111',
      email: 'accounts@apexretail.in',
      gstin: '27AABCA1234A1Z5',
      address: 'Shop 5, FC Road',
      city: 'Pune',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '411004',
      creditLimit: 50000.00,
      openingBalance: 0,
      currentBalance: 3800.00, // 3800 outstanding from partial payment invoice
    },
  });

  const customerB2C = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: 'Suresh Patil',
      phone: '9822022222',
      email: 'suresh.patil@example.com',
      address: 'Plot 24, Kothrud',
      city: 'Pune',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '411038',
      currentBalance: 0,
    },
  });

  // 8. Create Suppliers
  const supplier1 = await prisma.supplier.create({
    data: {
      businessId: business.id,
      name: 'Bharat Electronics Distribution Hub',
      phone: '9811033333',
      email: 'sales@bharatelectronics.com',
      gstin: '27BBBCD5678B1Z2',
      address: '402 Trade Center, Swargate',
      city: 'Pune',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '411042',
      currentBalance: 15000.00, // We owe them 15,000
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      businessId: business.id,
      name: 'Metro Wholesale FMCG Depot',
      phone: '9811044444',
      email: 'orders@metrowholesale.in',
      gstin: '27CCCEF9012C1Z8',
      address: 'MIDC Industrial Estate, Bhosari',
      city: 'Pune',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '411026',
      currentBalance: 0,
    },
  });

  console.log('✅ Customers & Suppliers created');

  // 9. Create Invoices
  // Invoice 1: Fully Paid B2C Invoice to Suresh Patil
  // 1 Scanner @ 2500 + 18% GST (CGST 225, SGST 225) = Total 2950
  const invoice1 = await prisma.invoice.create({
    data: {
      businessId: business.id,
      customerId: customerB2C.id,
      invoiceNumber: 'INV-2026-0001',
      invoiceDate: new Date(),
      type: InvoiceType.TAX_INVOICE,
      status: InvoiceStatus.PAID,
      isB2B: false,
      subtotal: 2500.00,
      taxableAmount: 2500.00,
      cgstAmount: 225.00,
      sgstAmount: 225.00,
      igstAmount: 0.00,
      totalTax: 450.00,
      grandTotal: 2950.00,
      paidAmount: 2950.00,
      balanceAmount: 0.00,
      notes: 'Thank you for your business with Khaki Karobari!',
      items: {
        create: [
          {
            productId: p1.id,
            description: 'Khaki Wireless 2D Barcode Scanner',
            hsnCode: '8471',
            quantity: 1,
            unit: 'PCS',
            unitPrice: 2500.00,
            taxableAmount: 2500.00,
            gstRate: 18.00,
            cgstAmount: 225.00,
            sgstAmount: 225.00,
            igstAmount: 0.00,
            totalAmount: 2950.00,
          },
        ],
      },
    },
  });

  // Payment for Invoice 1
  await prisma.payment.create({
    data: {
      businessId: business.id,
      type: PaymentType.RECEIVED,
      partyType: PartyType.CUSTOMER,
      customerId: customerB2C.id,
      invoiceId: invoice1.id,
      amount: 2950.00,
      paymentMethod: PaymentMethod.UPI,
      referenceNumber: 'UPI/2026/0924/78291',
      paymentDate: new Date(),
      notes: 'UPI payment received via QR',
      status: 'COMPLETED',
    },
  });

  // Invoice 2: Partially Paid B2B Invoice to Apex Supermarket
  // 1 Printer @ 3800 + 18% GST (CGST 342, SGST 342) = Total 4484
  // Paid: 684, Balance: 3800
  const invoice2 = await prisma.invoice.create({
    data: {
      businessId: business.id,
      customerId: customerB2B.id,
      invoiceNumber: 'INV-2026-0002',
      invoiceDate: new Date(),
      type: InvoiceType.TAX_INVOICE,
      status: InvoiceStatus.PARTIALLY_PAID,
      isB2B: true,
      subtotal: 3800.00,
      taxableAmount: 3800.00,
      cgstAmount: 342.00,
      sgstAmount: 342.00,
      igstAmount: 0.00,
      totalTax: 684.00,
      grandTotal: 4484.00,
      paidAmount: 684.00,
      balanceAmount: 3800.00,
      notes: 'Credit terms: 15 days',
      items: {
        create: [
          {
            productId: p2.id,
            description: 'Khaki Thermal Receipt Printer 80mm',
            hsnCode: '8443',
            quantity: 1,
            unit: 'PCS',
            unitPrice: 3800.00,
            taxableAmount: 3800.00,
            gstRate: 18.00,
            cgstAmount: 342.00,
            sgstAmount: 342.00,
            igstAmount: 0.00,
            totalAmount: 4484.00,
          },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      businessId: business.id,
      type: PaymentType.RECEIVED,
      partyType: PartyType.CUSTOMER,
      customerId: customerB2B.id,
      invoiceId: invoice2.id,
      amount: 684.00,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      referenceNumber: 'NEFT/HDFC/992831',
      paymentDate: new Date(),
      notes: 'Advance tax component payment',
      status: 'COMPLETED',
    },
  });

  // Customer Ledger Entries
  await prisma.ledgerEntry.createMany({
    data: [
      {
        businessId: business.id,
        partyType: PartyType.CUSTOMER,
        partyId: customerB2B.id,
        entryType: EntryType.DEBIT,
        amount: 4484.00,
        balanceAfter: 4484.00,
        referenceType: 'INVOICE',
        referenceId: invoice2.id,
        description: 'Invoice INV-2026-0002 generated',
      },
      {
        businessId: business.id,
        partyType: PartyType.CUSTOMER,
        partyId: customerB2B.id,
        entryType: EntryType.CREDIT,
        amount: 684.00,
        balanceAfter: 3800.00,
        referenceType: 'PAYMENT',
        referenceId: invoice2.id,
        description: 'Bank transfer received NEFT/HDFC/992831',
      },
    ],
  });

  // 10. Purchase from Supplier
  const purchase1 = await prisma.purchase.create({
    data: {
      businessId: business.id,
      supplierId: supplier1.id,
      purchaseNumber: 'PUR-2026-0001',
      purchaseDate: new Date(),
      status: PurchaseStatus.PARTIALLY_PAID,
      subtotal: 25000.00,
      taxableAmount: 25000.00,
      cgstAmount: 2250.00,
      sgstAmount: 2250.00,
      igstAmount: 0.00,
      totalTax: 4500.00,
      grandTotal: 29500.00,
      paidAmount: 14500.00,
      balanceAmount: 15000.00,
      notes: 'Bulk stock purchase for festive season',
      items: {
        create: [
          {
            productId: p1.id,
            description: 'Khaki Wireless 2D Barcode Scanner (Lot of 10)',
            hsnCode: '8471',
            quantity: 10,
            unit: 'PCS',
            unitPrice: 1800.00,
            taxableAmount: 18000.00,
            gstRate: 18.00,
            cgstAmount: 1620.00,
            sgstAmount: 1620.00,
            igstAmount: 0.00,
            totalAmount: 21240.00,
          },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      businessId: business.id,
      type: PaymentType.MADE,
      partyType: PartyType.SUPPLIER,
      supplierId: supplier1.id,
      purchaseId: purchase1.id,
      amount: 14500.00,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      referenceNumber: 'RTGS/ICICI/882101',
      paymentDate: new Date(),
      notes: 'Initial deposit payment',
      status: 'COMPLETED',
    },
  });

  // Supplier Ledger Entry
  await prisma.ledgerEntry.createMany({
    data: [
      {
        businessId: business.id,
        partyType: PartyType.SUPPLIER,
        partyId: supplier1.id,
        entryType: EntryType.CREDIT,
        amount: 29500.00,
        balanceAfter: 29500.00,
        referenceType: 'PURCHASE',
        referenceId: purchase1.id,
        description: 'Purchase bill PUR-2026-0001',
      },
      {
        businessId: business.id,
        partyType: PartyType.SUPPLIER,
        partyId: supplier1.id,
        entryType: EntryType.DEBIT,
        amount: 14500.00,
        balanceAfter: 15000.00,
        referenceType: 'PAYMENT',
        referenceId: purchase1.id,
        description: 'Bank payment made RTGS/ICICI/882101',
      },
    ],
  });

  // 11. Expense Categories & Expenses
  const expRent = await prisma.expenseCategory.create({
    data: { businessId: business.id, name: 'Shop Rent & Maintenance' },
  });
  const expUtility = await prisma.expenseCategory.create({
    data: { businessId: business.id, name: 'Electricity & Internet' },
  });
  const expRefresh = await prisma.expenseCategory.create({
    data: { businessId: business.id, name: 'Staff Refreshments & Tea' },
  });

  await prisma.expense.createMany({
    data: [
      {
        businessId: business.id,
        categoryId: expRent.id,
        title: 'September 2026 Shop Rent',
        amount: 12000.00,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentDate: new Date(),
        referenceNumber: 'NEFT/RENT/SEP26',
        recipient: 'Landlord MG Road Complex',
        notes: 'Monthly commercial rental payment',
      },
      {
        businessId: business.id,
        categoryId: expUtility.id,
        title: 'MSEDCL Electricity Bill',
        amount: 3250.00,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date(),
        referenceNumber: 'UPI/MSEDCL/4431',
        recipient: 'Maharashtra State Electricity Board',
      },
      {
        businessId: business.id,
        categoryId: expRefresh.id,
        title: 'Monthly Chai & Snacks',
        amount: 1400.00,
        paymentMethod: PaymentMethod.CASH,
        paymentDate: new Date(),
        recipient: 'Kothrud Tea Stall',
      },
    ],
  });

  // 12. Create Employees
  await prisma.employee.create({
    data: {
      businessId: business.id,
      name: 'Pooja Kulkarni',
      phone: '9822088888',
      email: 'pooja.k@khaki.com',
      designation: 'Senior Cashier & Accountant',
      salary: 28000.00,
      joiningDate: new Date('2025-01-10'),
    },
  });

  // 13. Audit Log & Notifications
  await prisma.auditLog.create({
    data: {
      businessId: business.id,
      userId: superAdmin.id,
      action: 'INITIAL_SETUP',
      entity: 'BUSINESS',
      entityId: business.id,
      details: JSON.stringify({ message: 'Khaki Karobari platform initialized with core business seeds.' }),
    },
  });

  await prisma.notification.create({
    data: {
      businessId: business.id,
      userId: superAdmin.id,
      title: 'Welcome to Khaki Karobari',
      message: 'Your production business management platform is configured and ready.',
      type: 'SYSTEM',
    },
  });

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

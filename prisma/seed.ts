import {
  PrismaClient,
  GlobalRole,
  BusinessRole,
  PartyType,
  EntryType,
  InvoiceType,
  InvoiceStatus,
  PaymentType,
  PaymentMethod,
  StockMovementType,
  PurchaseStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Khaki Karobari (v2 – rich dataset)...');

  // ─────────────────────────────────────────────────────────────────────────
  // 1. CLEAN ALL EXISTING TEST DATA (safe for development)
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // 2. USERS
  // ─────────────────────────────────────────────────────────────────────────
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

  console.log('✅ Users created');

  // ─────────────────────────────────────────────────────────────────────────
  // 3. BUSINESS
  // ─────────────────────────────────────────────────────────────────────────
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

  console.log('✅ Business & memberships created');

  // ─────────────────────────────────────────────────────────────────────────
  // 4. CATEGORIES (6)
  // ─────────────────────────────────────────────────────────────────────────
  const catElectronics = await prisma.category.create({
    data: { businessId: business.id, name: 'Electronics & POS', description: 'POS hardware, scanners, printers' },
  });
  const catStationery = await prisma.category.create({
    data: { businessId: business.id, name: 'Stationery & Packaging', description: 'Office supplies, thermal rolls, packing material' },
  });
  const catFMCG = await prisma.category.create({
    data: { businessId: business.id, name: 'Daily Essentials & FMCG', description: 'Packaged food, beverages, commodities' },
  });
  const catHardware = await prisma.category.create({
    data: { businessId: business.id, name: 'Tools & Hardware', description: 'Hand tools, industrial hardware' },
  });
  const catApparel = await prisma.category.create({
    data: { businessId: business.id, name: 'Uniforms & Workwear', description: 'Corporate and industrial uniforms' },
  });
  const catServices = await prisma.category.create({
    data: { businessId: business.id, name: 'Services & AMC', description: 'Annual maintenance, software subscriptions' },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. BRANDS (5)
  // ─────────────────────────────────────────────────────────────────────────
  const brandKhaki  = await prisma.brand.create({ data: { businessId: business.id, name: 'Khaki KrypTech' } });
  const brandSamsung = await prisma.brand.create({ data: { businessId: business.id, name: 'Samsung' } });
  const brandTata    = await prisma.brand.create({ data: { businessId: business.id, name: 'Tata' } });
  const brandHoneywell = await prisma.brand.create({ data: { businessId: business.id, name: 'Honeywell' } });
  const brandHPIndia  = await prisma.brand.create({ data: { businessId: business.id, name: 'HP India' } });

  console.log('✅ Categories & Brands created');

  // ─────────────────────────────────────────────────────────────────────────
  // 6. PRODUCTS (20)
  // ─────────────────────────────────────────────────────────────────────────

  // Electronics (8)
  const p1 = await prisma.product.create({ data: { businessId: business.id, categoryId: catElectronics.id, brandId: brandKhaki.id, name: 'Khaki Wireless 2D Barcode Scanner', sku: 'KHK-SCN-001', barcode: '8901234567890', description: 'High precision wireless laser scanner with USB receiver', unit: 'PCS', hsnCode: '8471', purchasePrice: 1800, sellingPrice: 2500, mrp: 2999, gstRate: 18, minStockAlert: 5, currentStock: 25, isActive: true } });
  const p2 = await prisma.product.create({ data: { businessId: business.id, categoryId: catElectronics.id, brandId: brandKhaki.id, name: 'Khaki Thermal Receipt Printer 80mm', sku: 'KHK-PRN-002', barcode: '8901234567891', description: 'High speed direct thermal bill printer (USB + Bluetooth)', unit: 'PCS', hsnCode: '8443', purchasePrice: 2800, sellingPrice: 3800, mrp: 4500, gstRate: 18, minStockAlert: 3, currentStock: 15, isActive: true } });
  const p3 = await prisma.product.create({ data: { businessId: business.id, categoryId: catElectronics.id, brandId: brandHoneywell.id, name: 'Honeywell Voyager 1202G Laser Scanner', sku: 'HNW-SCN-1202', barcode: '0852756005267', description: 'Industrial grade single-line laser barcode scanner', unit: 'PCS', hsnCode: '8471', purchasePrice: 4200, sellingPrice: 5800, mrp: 6500, gstRate: 18, minStockAlert: 3, currentStock: 8, isActive: true } });
  const p4 = await prisma.product.create({ data: { businessId: business.id, categoryId: catElectronics.id, brandId: brandSamsung.id, name: 'Samsung Galaxy Tab A8 POS Bundle', sku: 'SAM-TAB-A8-POS', barcode: '8806094268362', description: 'Samsung Tab A8 + Stand + Cash Drawer POS Kit', unit: 'PCS', hsnCode: '8471', purchasePrice: 18500, sellingPrice: 22500, mrp: 25999, gstRate: 18, minStockAlert: 2, currentStock: 4, isActive: true } });
  const p5 = await prisma.product.create({ data: { businessId: business.id, categoryId: catElectronics.id, brandId: brandHPIndia.id, name: 'HP LaserJet M110w Wireless Printer', sku: 'HP-LJ-M110W', barcode: '0195908267841', description: 'Compact wireless mono laser printer for small businesses', unit: 'PCS', hsnCode: '8443', purchasePrice: 8900, sellingPrice: 12500, mrp: 14999, gstRate: 18, minStockAlert: 2, currentStock: 3, isActive: true } });
  const p6 = await prisma.product.create({ data: { businessId: business.id, categoryId: catElectronics.id, brandId: brandKhaki.id, name: 'Khaki Cash Drawer 4-Slot Steel', sku: 'KHK-CDR-004', barcode: '8901234567895', description: '4-slot steel cash drawer with RJ11 connector for POS printers', unit: 'PCS', hsnCode: '8470', purchasePrice: 950, sellingPrice: 1450, mrp: 1800, gstRate: 18, minStockAlert: 5, currentStock: 18, isActive: true } });
  // LOW STOCK product
  const p7 = await prisma.product.create({ data: { businessId: business.id, categoryId: catElectronics.id, brandId: brandKhaki.id, name: 'Khaki Bluetooth Card Reader EMV', sku: 'KHK-CRD-007', barcode: '8901234567896', description: 'Bluetooth EMV+NFC card reader for UPI & card payments', unit: 'PCS', hsnCode: '8473', purchasePrice: 1100, sellingPrice: 1600, mrp: 1999, gstRate: 18, minStockAlert: 5, currentStock: 3, isActive: true } });
  // OUT OF STOCK product
  const p8 = await prisma.product.create({ data: { businessId: business.id, categoryId: catElectronics.id, brandId: brandSamsung.id, name: 'Samsung Galaxy A05 POS Display', sku: 'SAM-A05-POS', barcode: '8806094958521', description: 'Customer-facing display for POS counter', unit: 'PCS', hsnCode: '8471', purchasePrice: 6500, sellingPrice: 9000, mrp: 10999, gstRate: 18, minStockAlert: 2, currentStock: 0, isActive: true } });

  // Stationery (3)
  const p9  = await prisma.product.create({ data: { businessId: business.id, categoryId: catStationery.id, name: 'Thermal Billing Rolls 80mm (Pack of 10)', sku: 'ROL-80MM-10', barcode: '8901234567893', description: 'BPA-free thermal paper rolls for 80mm POS printers', unit: 'PACK', hsnCode: '4802', purchasePrice: 220, sellingPrice: 350, mrp: 400, gstRate: 12, minStockAlert: 10, currentStock: 60, isActive: true } });
  const p10 = await prisma.product.create({ data: { businessId: business.id, categoryId: catStationery.id, name: 'Thermal Billing Rolls 58mm (Pack of 10)', sku: 'ROL-58MM-10', barcode: '8901234567894', description: 'BPA-free thermal paper rolls for 58mm mini printers', unit: 'PACK', hsnCode: '4802', purchasePrice: 170, sellingPrice: 280, mrp: 320, gstRate: 12, minStockAlert: 10, currentStock: 35, isActive: true } });
  const p11 = await prisma.product.create({ data: { businessId: business.id, categoryId: catStationery.id, name: 'Bubble Wrap Roll 1m x 5m', sku: 'PKG-BWR-1X5', barcode: '8901234567897', description: 'Small bubble protective packaging wrap', unit: 'ROLL', hsnCode: '3926', purchasePrice: 180, sellingPrice: 300, mrp: 350, gstRate: 18, minStockAlert: 5, currentStock: 20, isActive: true } });

  // FMCG (4)
  const p12 = await prisma.product.create({ data: { businessId: business.id, categoryId: catFMCG.id, brandId: brandTata.id, name: 'Tata Tea Gold Premium 500g', sku: 'TAT-TEA-500', barcode: '8901234567892', description: 'Rich aroma CTC tea blend', unit: 'PACK', hsnCode: '0902', purchasePrice: 240, sellingPrice: 310, mrp: 330, gstRate: 5, minStockAlert: 10, currentStock: 48, isActive: true } });
  const p13 = await prisma.product.create({ data: { businessId: business.id, categoryId: catFMCG.id, brandId: brandTata.id, name: 'Tata Salt Crystal 1kg', sku: 'TAT-SAL-1KG', barcode: '8901234567898', description: 'Refined iodized crystal salt', unit: 'KG', hsnCode: '2501', purchasePrice: 18, sellingPrice: 25, mrp: 28, gstRate: 0, minStockAlert: 50, currentStock: 150, isActive: true } });
  const p14 = await prisma.product.create({ data: { businessId: business.id, categoryId: catFMCG.id, name: 'Parachute Coconut Oil 200ml', sku: 'PAR-OIL-200', barcode: '8901234567899', description: '100% pure coconut oil – hair and skin', unit: 'PCS', hsnCode: '1513', purchasePrice: 65, sellingPrice: 85, mrp: 90, gstRate: 5, minStockAlert: 20, currentStock: 72, isActive: true } });
  const p15 = await prisma.product.create({ data: { businessId: business.id, categoryId: catFMCG.id, name: 'Aashirvaad Atta 5kg', sku: 'AAH-ATT-5KG', barcode: '8901234567900', description: 'Whole wheat atta with natural fibre', unit: 'BAG', hsnCode: '1101', purchasePrice: 210, sellingPrice: 265, mrp: 280, gstRate: 0, minStockAlert: 15, currentStock: 32, isActive: true } });

  // Hardware (2)
  const p16 = await prisma.product.create({ data: { businessId: business.id, categoryId: catHardware.id, name: 'Anchor Roma Electrical Switch 6A (5 pc)', sku: 'ANC-SW-6A-5', barcode: '8901234567901', description: 'Modular 6A single switch for residential wiring', unit: 'PACK', hsnCode: '8536', purchasePrice: 65, sellingPrice: 95, mrp: 110, gstRate: 18, minStockAlert: 20, currentStock: 80, isActive: true } });
  const p17 = await prisma.product.create({ data: { businessId: business.id, categoryId: catHardware.id, name: 'Stanley Measuring Tape 5m', sku: 'STN-TAPE-5M', barcode: '8906093790099', description: 'Auto-lock 5m measuring tape with belt clip', unit: 'PCS', hsnCode: '9017', purchasePrice: 180, sellingPrice: 260, mrp: 299, gstRate: 18, minStockAlert: 10, currentStock: 22, isActive: true } });

  // Apparel (2)
  const p18 = await prisma.product.create({ data: { businessId: business.id, categoryId: catApparel.id, name: 'Corporate Polo T-Shirt (Embroidered)', sku: 'UNI-PLO-EMB', barcode: '8901234567902', description: 'Custom logo embroidered polo uniform T-shirt', unit: 'PCS', hsnCode: '6110', purchasePrice: 350, sellingPrice: 550, mrp: 650, gstRate: 5, minStockAlert: 10, currentStock: 45, isActive: true } });
  const p19 = await prisma.product.create({ data: { businessId: business.id, categoryId: catApparel.id, name: 'Safety Shoes (Steel Toe) Size 8', sku: 'SAF-SHO-S8', barcode: '8901234567903', description: 'ISI marked industrial safety shoes with steel toe cap', unit: 'PAIR', hsnCode: '6403', purchasePrice: 820, sellingPrice: 1200, mrp: 1450, gstRate: 18, minStockAlert: 5, currentStock: 12, isActive: true } });

  // Service (1)
  const p20 = await prisma.product.create({ data: { businessId: business.id, categoryId: catServices.id, brandId: brandKhaki.id, name: 'Khaki Karobari SaaS Subscription (Annual)', sku: 'KHK-SaaS-ANN', description: 'Annual business ERP subscription – unlimited users', unit: 'PCS', hsnCode: '9983', purchasePrice: 0, sellingPrice: 9999, mrp: 12000, gstRate: 18, minStockAlert: 0, currentStock: 999, isService: true, isActive: true } });

  // Record Initial Stock Movements for all physical products
  const allProducts = [p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12,p13,p14,p15,p16,p17,p18,p19];
  for (const prod of allProducts) {
    await prisma.stockMovement.create({
      data: {
        businessId: business.id,
        productId: prod.id,
        type: StockMovementType.INITIAL,
        quantity: prod.currentStock,
        previousStock: 0,
        currentStock: prod.currentStock,
        referenceType: 'INITIAL_STOCK',
        notes: 'Opening stock entry – seeded',
      },
    });
  }

  console.log('✅ 20 Products & stock movements created');

  // ─────────────────────────────────────────────────────────────────────────
  // 7. CUSTOMERS (12)
  // ─────────────────────────────────────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.create({ data: { businessId: business.id, name: 'Apex Supermarket Pvt Ltd', phone: '9822011111', email: 'accounts@apexretail.in', gstin: '27AABCA1234A1Z5', address: 'Shop 5, FC Road', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411004', creditLimit: 100000, openingBalance: 0, currentBalance: 14500 } }),
    prisma.customer.create({ data: { businessId: business.id, name: 'Suresh Patil', phone: '9822022222', email: 'suresh.patil@example.com', address: 'Plot 24, Kothrud', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411038', currentBalance: 0 } }),
    prisma.customer.create({ data: { businessId: business.id, name: 'Rajendra Kumar & Sons', phone: '9822033333', email: 'rk.sons@traders.in', gstin: '27AAFPR5678F1Z9', address: 'Shop 12, Shivaji Market', city: 'Nashik', state: 'Maharashtra', stateCode: '27', pincode: '422001', creditLimit: 75000, currentBalance: 8400 } }),
    prisma.customer.create({ data: { businessId: business.id, name: 'City Convenience Store', phone: '9822044444', email: 'city.store@gmail.com', address: 'Near Bus Stand, Hadapsar', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411028', creditLimit: 30000, currentBalance: 0 } }),
    prisma.customer.create({ data: { businessId: business.id, name: 'Omkar Electronics & Repairs', phone: '9890123456', email: 'omkar.elec@yahoo.in', address: 'Plot 8, Bhavani Peth', city: 'Solapur', state: 'Maharashtra', stateCode: '27', pincode: '413002', currentBalance: 3600 } }),
    prisma.customer.create({ data: { businessId: business.id, name: 'Mahindra Agri Solutions Ltd', phone: '9811055555', email: 'procurement@mahindra-agri.in', gstin: '27AABCM9012M1Z3', address: 'Ground Floor, Udyog Bhavan', city: 'Mumbai', state: 'Maharashtra', stateCode: '27', pincode: '400021', creditLimit: 500000, currentBalance: 0 } }),
    prisma.customer.create({ data: { businessId: business.id, name: 'Priya Textile Mills', phone: '9833066666', email: 'priya.textiles@bizmail.in', gstin: '27AAFPT2345T1Z7', address: 'MIDC Bhosari, Plot 34', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411026', creditLimit: 200000, currentBalance: 21000 } }),
    prisma.customer.create({ data: { businessId: business.id, name: 'Ganesh Kirana Store', phone: '9822077777', email: '', address: 'Main Road, Kondwa', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411048', currentBalance: 1200 } }),
    prisma.customer.create({ data: { businessId: business.id, name: 'Anita Wagh', phone: '9822088888', email: 'anita.wagh@example.com', address: 'Flat 3, Silver Oaks, Baner', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411045', currentBalance: 0 } }),
    prisma.customer.create({ data: { businessId: business.id, name: 'Ratan Hardware & Tools', phone: '8855109876', email: 'ratan.hw@tradersmail.in', address: 'Shop 7, Hardware Market, Camp', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411001', creditLimit: 50000, currentBalance: 0 } }),
    prisma.customer.create({ data: { businessId: business.id, name: 'Sunrise School PTA Store', phone: '9822099999', email: 'store@sunriseschool.edu.in', address: 'Survey 45, Wakad', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411057', creditLimit: 25000, currentBalance: 4750 } }),
    prisma.customer.create({ data: { businessId: business.id, name: 'Vikram Industrial Supplies', phone: '9812340101', email: 'vikram.ind@gmail.com', gstin: '27AAFVK7890V1Z1', address: 'Shop 22, Industrial Estate', city: 'Aurangabad', state: 'Maharashtra', stateCode: '27', pincode: '431001', creditLimit: 150000, currentBalance: 0 } }),
  ]);

  const [custApex, custSuresh, custRajendra, custCity, custOmkar, custMahindra, custPriya, custGanesh, custAnita, custRatan, custSunrise, custVikram] = customers;

  console.log('✅ 12 Customers created');

  // ─────────────────────────────────────────────────────────────────────────
  // 8. SUPPLIERS (6)
  // ─────────────────────────────────────────────────────────────────────────
  const supBharat = await prisma.supplier.create({ data: { businessId: business.id, name: 'Bharat Electronics Distribution Hub', phone: '9811033333', email: 'sales@bharatelectronics.com', gstin: '27BBBCD5678B1Z2', address: '402 Trade Center, Swargate', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411042', currentBalance: 15000 } });
  const supMetro  = await prisma.supplier.create({ data: { businessId: business.id, name: 'Metro Wholesale FMCG Depot', phone: '9811044444', email: 'orders@metrowholesale.in', gstin: '27CCCEF9012C1Z8', address: 'MIDC Industrial Estate, Bhosari', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411026', currentBalance: 0 } });
  const supKhaki  = await prisma.supplier.create({ data: { businessId: business.id, name: 'Khaki KrypTech Products LLP', phone: '9811055555', email: 'supply@khakikryptech.in', gstin: '29AAPFU0931P1Z8', address: '14th Floor, World Trade Center', city: 'Bengaluru', state: 'Karnataka', stateCode: '29', pincode: '560001', currentBalance: 0 } });
  const supKapoor = await prisma.supplier.create({ data: { businessId: business.id, name: 'Kapoor Stationery Wholesale', phone: '9811066666', email: 'kapoor.stat@gmail.com', address: '22 Paper Market, Mandai', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411042', currentBalance: 5500 } });
  const supTataDist = await prisma.supplier.create({ data: { businessId: business.id, name: 'Tata Consumer Products Distributor', phone: '9811077777', email: 'tata.dist@tradelink.in', gstin: '27AAACT1000C1Z7', address: 'Depot 8, Wagholi Distribution Center', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '412207', currentBalance: 0 } });
  const supPrime  = await prisma.supplier.create({ data: { businessId: business.id, name: 'Prime Hardware Imports & Co.', phone: '9811088888', email: 'prime.hw@imports.in', gstin: '27AABCP4567P1Z4', address: 'Plot 15, Hardware Complex, Chakan', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '410501', currentBalance: 0 } });

  console.log('✅ 6 Suppliers created');

  // ─────────────────────────────────────────────────────────────────────────
  // 9. EMPLOYEES (4)
  // ─────────────────────────────────────────────────────────────────────────
  await prisma.employee.createMany({
    data: [
      { businessId: business.id, name: 'Pooja Kulkarni', phone: '9822088881', email: 'pooja.k@khaki.com', designation: 'Senior Cashier & Accountant', salary: 28000, joiningDate: new Date('2025-01-10') },
      { businessId: business.id, name: 'Mahesh Waghmare', phone: '9822088882', email: 'mahesh.w@khaki.com', designation: 'Inventory & Warehouse Executive', salary: 22000, joiningDate: new Date('2025-06-01') },
      { businessId: business.id, name: 'Sunita Deshmukh', phone: '9822088883', email: 'sunita.d@khaki.com', designation: 'Customer Relations Manager', salary: 25000, joiningDate: new Date('2024-11-15') },
      { businessId: business.id, name: 'Ravi Khandagale', phone: '9822088884', email: 'ravi.kh@khaki.com', designation: 'Delivery & Logistics Coordinator', salary: 18500, joiningDate: new Date('2026-02-20') },
    ],
  });

  console.log('✅ 4 Employees created');

  // ─────────────────────────────────────────────────────────────────────────
  // 10. INVOICES (12) with line items and payments
  // ─────────────────────────────────────────────────────────────────────────

  const makeDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d;
  };

  // Invoice helpers
  const createInvoice = async (params: {
    number: string;
    customer: { id: string };
    daysAgo: number;
    status: InvoiceStatus;
    isB2B?: boolean;
    items: Array<{ productId: string; qty: number; price: number; gstRate: number; desc?: string; hsnCode?: string }>;
    notes?: string;
    paidAmount: number;
  }) => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    const itemData = params.items.map((it) => {
      const taxable = it.qty * it.price;
      const itemCgst = Math.round(taxable * (it.gstRate / 2) / 100 * 100) / 100;
      const itemSgst = itemCgst;
      const total = taxable + itemCgst + itemSgst;
      subtotal += taxable;
      cgst += itemCgst;
      sgst += itemSgst;
      return {
        productId: it.productId,
        description: it.desc,
        hsnCode: it.hsnCode,
        quantity: it.qty,
        unit: 'PCS',
        unitPrice: it.price,
        taxableAmount: taxable,
        gstRate: it.gstRate,
        cgstAmount: itemCgst,
        sgstAmount: itemSgst,
        igstAmount: 0,
        totalAmount: total,
      };
    });
    const grandTotal = subtotal + cgst + sgst;
    const balance = grandTotal - params.paidAmount;

    return prisma.invoice.create({
      data: {
        businessId: business.id,
        customerId: params.customer.id,
        invoiceNumber: params.number,
        invoiceDate: makeDate(params.daysAgo),
        type: InvoiceType.TAX_INVOICE,
        status: params.status,
        isB2B: params.isB2B ?? false,
        subtotal,
        taxableAmount: subtotal,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: 0,
        totalTax: cgst + sgst,
        grandTotal,
        paidAmount: params.paidAmount,
        balanceAmount: Math.max(0, balance),
        notes: params.notes ?? 'Thank you for your business!',
        items: { create: itemData },
      },
    });
  };

  const inv01 = await createInvoice({ number: 'INV-2026-0001', customer: custSuresh,    daysAgo: 1,  status: InvoiceStatus.PAID,           paidAmount: 2950,  items: [{ productId: p1.id,  qty: 1, price: 2500,  gstRate: 18, desc: 'Khaki Wireless 2D Barcode Scanner', hsnCode: '8471' }] });
  const inv02 = await createInvoice({ number: 'INV-2026-0002', customer: custApex,     daysAgo: 3,  status: InvoiceStatus.PARTIALLY_PAID, paidAmount: 684,   isB2B: true, items: [{ productId: p2.id, qty: 1, price: 3800, gstRate: 18, desc: 'Khaki Thermal Receipt Printer 80mm', hsnCode: '8443' }] });
  const inv03 = await createInvoice({ number: 'INV-2026-0003', customer: custRajendra, daysAgo: 5,  status: InvoiceStatus.PAID,           paidAmount: 6844,  isB2B: true, items: [{ productId: p3.id, qty: 1, price: 5800, gstRate: 18 }, { productId: p9.id, qty: 2, price: 350, gstRate: 12 }] });
  const inv04 = await createInvoice({ number: 'INV-2026-0004', customer: custCity,     daysAgo: 6,  status: InvoiceStatus.UNPAID,         paidAmount: 0,     items: [{ productId: p12.id, qty: 10, price: 310, gstRate: 5 }, { productId: p13.id, qty: 20, price: 25, gstRate: 0 }] });
  const inv05 = await createInvoice({ number: 'INV-2026-0005', customer: custOmkar,    daysAgo: 8,  status: InvoiceStatus.PARTIALLY_PAID, paidAmount: 2000,  items: [{ productId: p6.id, qty: 4, price: 1450, gstRate: 18 }] });
  const inv06 = await createInvoice({ number: 'INV-2026-0006', customer: custMahindra, daysAgo: 10, status: InvoiceStatus.PAID,           paidAmount: 26550, isB2B: true, items: [{ productId: p4.id, qty: 1, price: 22500, gstRate: 18 }] });
  const inv07 = await createInvoice({ number: 'INV-2026-0007', customer: custPriya,    daysAgo: 12, status: InvoiceStatus.PAID,           paidAmount: 10620, isB2B: true, items: [{ productId: p18.id, qty: 15, price: 550, gstRate: 5 }, { productId: p19.id, qty: 2, price: 1200, gstRate: 18 }] });
  const inv08 = await createInvoice({ number: 'INV-2026-0008', customer: custGanesh,   daysAgo: 14, status: InvoiceStatus.UNPAID,         paidAmount: 0,     items: [{ productId: p14.id, qty: 6, price: 85, gstRate: 5 }, { productId: p15.id, qty: 4, price: 265, gstRate: 0 }] });
  const inv09 = await createInvoice({ number: 'INV-2026-0009', customer: custAnita,    daysAgo: 16, status: InvoiceStatus.PAID,           paidAmount: 399,   items: [{ productId: p10.id, qty: 1, price: 280, gstRate: 12 }, { productId: p13.id, qty: 3, price: 25, gstRate: 0 }] });
  const inv10 = await createInvoice({ number: 'INV-2026-0010', customer: custRatan,    daysAgo: 20, status: InvoiceStatus.PAID,           paidAmount: 3894,  items: [{ productId: p16.id, qty: 20, price: 95, gstRate: 18 }, { productId: p17.id, qty: 5, price: 260, gstRate: 18 }] });
  const inv11 = await createInvoice({ number: 'INV-2026-0011', customer: custSunrise,  daysAgo: 25, status: InvoiceStatus.PARTIALLY_PAID, paidAmount: 3000,  items: [{ productId: p20.id, qty: 1, price: 9999, gstRate: 18 }] });
  const inv12 = await createInvoice({ number: 'INV-2026-0012', customer: custVikram,   daysAgo: 30, status: InvoiceStatus.PAID,           paidAmount: 11210, isB2B: true, items: [{ productId: p5.id, qty: 1, price: 12500, gstRate: 18 }, { productId: p11.id, qty: 3, price: 300, gstRate: 18 }] });

  console.log('✅ 12 Invoices created');

  // ─────────────────────────────────────────────────────────────────────────
  // 11. PAYMENTS RECEIVED (for invoices)
  // ─────────────────────────────────────────────────────────────────────────
  const paymentData: Array<{ customerId: string; invoiceId: string; amount: number; method: PaymentMethod; ref: string; daysAgo: number }> = [
    { customerId: custSuresh.id,    invoiceId: inv01.id, amount: 2950,  method: PaymentMethod.UPI,           ref: 'UPI/2026/0924/78291',    daysAgo: 1  },
    { customerId: custApex.id,      invoiceId: inv02.id, amount: 684,   method: PaymentMethod.BANK_TRANSFER, ref: 'NEFT/HDFC/992831',        daysAgo: 3  },
    { customerId: custRajendra.id,  invoiceId: inv03.id, amount: 6844,  method: PaymentMethod.CHEQUE,        ref: 'CHQ/SBI/00112233',        daysAgo: 5  },
    { customerId: custOmkar.id,     invoiceId: inv05.id, amount: 2000,  method: PaymentMethod.CASH,          ref: 'CASH/RCPT/0005',          daysAgo: 7  },
    { customerId: custMahindra.id,  invoiceId: inv06.id, amount: 26550, method: PaymentMethod.BANK_TRANSFER, ref: 'RTGS/ICICI/4412201',       daysAgo: 10 },
    { customerId: custPriya.id,     invoiceId: inv07.id, amount: 10620, method: PaymentMethod.BANK_TRANSFER, ref: 'NEFT/AXIS/5589301',        daysAgo: 12 },
    { customerId: custAnita.id,     invoiceId: inv09.id, amount: 399,   method: PaymentMethod.UPI,           ref: 'UPI/GPay/0190231',        daysAgo: 16 },
    { customerId: custRatan.id,     invoiceId: inv10.id, amount: 3894,  method: PaymentMethod.CASH,          ref: 'CASH/RCPT/0010',          daysAgo: 20 },
    { customerId: custSunrise.id,   invoiceId: inv11.id, amount: 3000,  method: PaymentMethod.UPI,           ref: 'UPI/Paytm/0011231',       daysAgo: 24 },
    { customerId: custVikram.id,    invoiceId: inv12.id, amount: 11210, method: PaymentMethod.BANK_TRANSFER, ref: 'IMPS/PNB/9920011',        daysAgo: 30 },
  ];

  for (const p of paymentData) {
    const d = makeDate(p.daysAgo);
    await prisma.payment.create({
      data: {
        businessId: business.id,
        type: PaymentType.RECEIVED,
        partyType: PartyType.CUSTOMER,
        customerId: p.customerId,
        invoiceId: p.invoiceId,
        amount: p.amount,
        paymentMethod: p.method,
        referenceNumber: p.ref,
        paymentDate: d,
        status: 'COMPLETED',
      },
    });
  }

  console.log('✅ 10 Payments received created');

  // ─────────────────────────────────────────────────────────────────────────
  // 12. PURCHASES (5) with payments made
  // ─────────────────────────────────────────────────────────────────────────
  const pur1 = await prisma.purchase.create({
    data: {
      businessId: business.id,
      supplierId: supBharat.id,
      purchaseNumber: 'PUR-2026-0001',
      purchaseDate: makeDate(20),
      status: PurchaseStatus.PARTIALLY_PAID,
      subtotal: 25000,
      taxableAmount: 25000,
      cgstAmount: 2250,
      sgstAmount: 2250,
      igstAmount: 0,
      totalTax: 4500,
      grandTotal: 29500,
      paidAmount: 14500,
      balanceAmount: 15000,
      notes: 'Bulk electronics purchase for festive season',
      items: {
        create: [
          { productId: p1.id, description: 'Khaki Scanner (Lot of 10)', hsnCode: '8471', quantity: 10, unit: 'PCS', unitPrice: 1800, taxableAmount: 18000, gstRate: 18, cgstAmount: 1620, sgstAmount: 1620, igstAmount: 0, totalAmount: 21240 },
          { productId: p6.id, description: 'Cash Drawers (Lot of 5)', hsnCode: '8470', quantity: 5, unit: 'PCS', unitPrice: 950, taxableAmount: 4750, gstRate: 18, cgstAmount: 427.5, sgstAmount: 427.5, igstAmount: 0, totalAmount: 5605 },
        ],
      },
    },
  });

  const pur2 = await prisma.purchase.create({
    data: {
      businessId: business.id,
      supplierId: supMetro.id,
      purchaseNumber: 'PUR-2026-0002',
      purchaseDate: makeDate(15),
      status: PurchaseStatus.PAID,
      subtotal: 14200,
      taxableAmount: 14200,
      cgstAmount: 355,
      sgstAmount: 355,
      igstAmount: 0,
      totalTax: 710,
      grandTotal: 14910,
      paidAmount: 14910,
      balanceAmount: 0,
      notes: 'Monthly FMCG stock',
      items: {
        create: [
          { productId: p12.id, description: 'Tata Tea Gold 500g x 50', hsnCode: '0902', quantity: 50, unit: 'PACK', unitPrice: 240, taxableAmount: 12000, gstRate: 5, cgstAmount: 300, sgstAmount: 300, igstAmount: 0, totalAmount: 12600 },
          { productId: p13.id, description: 'Tata Salt 1kg x 100', hsnCode: '2501', quantity: 100, unit: 'KG', unitPrice: 18, taxableAmount: 1800, gstRate: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalAmount: 1800 },
          { productId: p14.id, description: 'Parachute Coconut Oil 200ml x 20', hsnCode: '1513', quantity: 20, unit: 'PCS', unitPrice: 65, taxableAmount: 1300, gstRate: 5, cgstAmount: 32.5, sgstAmount: 32.5, igstAmount: 0, totalAmount: 1365 },
        ],
      },
    },
  });

  const pur3 = await prisma.purchase.create({
    data: {
      businessId: business.id,
      supplierId: supKapoor.id,
      purchaseNumber: 'PUR-2026-0003',
      purchaseDate: makeDate(10),
      status: PurchaseStatus.PARTIALLY_PAID,
      subtotal: 11000,
      taxableAmount: 11000,
      cgstAmount: 660,
      sgstAmount: 660,
      igstAmount: 0,
      totalTax: 1320,
      grandTotal: 12320,
      paidAmount: 6820,
      balanceAmount: 5500,
      notes: 'Stationery and packaging restock',
      items: {
        create: [
          { productId: p9.id,  description: 'Thermal Rolls 80mm x 50 packs', hsnCode: '4802', quantity: 50, unit: 'PACK', unitPrice: 220, taxableAmount: 11000, gstRate: 12, cgstAmount: 660, sgstAmount: 660, igstAmount: 0, totalAmount: 12320 },
        ],
      },
    },
  });

  const pur4 = await prisma.purchase.create({
    data: {
      businessId: business.id,
      supplierId: supKhaki.id,
      purchaseNumber: 'PUR-2026-0004',
      purchaseDate: makeDate(5),
      status: PurchaseStatus.RECEIVED,
      subtotal: 13200,
      taxableAmount: 13200,
      cgstAmount: 1188,
      sgstAmount: 1188,
      igstAmount: 0,
      totalTax: 2376,
      grandTotal: 15576,
      paidAmount: 0,
      balanceAmount: 15576,
      notes: 'New accessories batch from Khaki KrypTech',
      items: {
        create: [
          { productId: p7.id, description: 'BT Card Reader x 6 units', hsnCode: '8473', quantity: 6, unit: 'PCS', unitPrice: 1100, taxableAmount: 6600, gstRate: 18, cgstAmount: 594, sgstAmount: 594, igstAmount: 0, totalAmount: 7788 },
          { productId: p2.id, description: 'Thermal Printer x 2 units', hsnCode: '8443', quantity: 2, unit: 'PCS', unitPrice: 2800, taxableAmount: 5600, gstRate: 18, cgstAmount: 504, sgstAmount: 504, igstAmount: 0, totalAmount: 6608 },
        ],
      },
    },
  });

  const pur5 = await prisma.purchase.create({
    data: {
      businessId: business.id,
      supplierId: supPrime.id,
      purchaseNumber: 'PUR-2026-0005',
      purchaseDate: makeDate(2),
      status: PurchaseStatus.ORDERED,
      subtotal: 7000,
      taxableAmount: 7000,
      cgstAmount: 630,
      sgstAmount: 630,
      igstAmount: 0,
      totalTax: 1260,
      grandTotal: 8260,
      paidAmount: 0,
      balanceAmount: 8260,
      notes: 'Hardware tools order – awaiting delivery',
      items: {
        create: [
          { productId: p16.id, description: 'Anchor Switches (100 packs)', hsnCode: '8536', quantity: 100, unit: 'PACK', unitPrice: 65, taxableAmount: 6500, gstRate: 18, cgstAmount: 585, sgstAmount: 585, igstAmount: 0, totalAmount: 7670 },
          { productId: p17.id, description: 'Stanley Tape Measures (5)', hsnCode: '9017', quantity: 5, unit: 'PCS', unitPrice: 180, taxableAmount: 900, gstRate: 18, cgstAmount: 81, sgstAmount: 81, igstAmount: 0, totalAmount: 1062 },
        ],
      },
    },
  });

  // Payments made to suppliers
  await prisma.payment.create({ data: { businessId: business.id, type: PaymentType.MADE, partyType: PartyType.SUPPLIER, supplierId: supBharat.id, purchaseId: pur1.id, amount: 14500, paymentMethod: PaymentMethod.BANK_TRANSFER, referenceNumber: 'RTGS/ICICI/882101', paymentDate: makeDate(19), status: 'COMPLETED' } });
  await prisma.payment.create({ data: { businessId: business.id, type: PaymentType.MADE, partyType: PartyType.SUPPLIER, supplierId: supMetro.id,  purchaseId: pur2.id, amount: 14910, paymentMethod: PaymentMethod.UPI,           referenceNumber: 'UPI/PhonePe/0099',  paymentDate: makeDate(14), status: 'COMPLETED' } });
  await prisma.payment.create({ data: { businessId: business.id, type: PaymentType.MADE, partyType: PartyType.SUPPLIER, supplierId: supKapoor.id, purchaseId: pur3.id, amount: 6820,  paymentMethod: PaymentMethod.CASH,           referenceNumber: 'CASH/SUP/003',      paymentDate: makeDate(9),  status: 'COMPLETED' } });

  console.log('✅ 5 Purchases & supplier payments created');

  // ─────────────────────────────────────────────────────────────────────────
  // 13. LEDGER ENTRIES (key transactions)
  // ─────────────────────────────────────────────────────────────────────────
  // Customer Ledger Highlights
  await prisma.ledgerEntry.createMany({ data: [
    { businessId: business.id, partyType: PartyType.CUSTOMER, partyId: custApex.id, entryType: EntryType.DEBIT,  amount: 4484,  balanceAfter: 4484,  referenceType: 'INVOICE',  referenceId: inv02.id, description: 'Invoice INV-2026-0002 raised', date: makeDate(3) },
    { businessId: business.id, partyType: PartyType.CUSTOMER, partyId: custApex.id, entryType: EntryType.CREDIT, amount: 684,   balanceAfter: 3800,  referenceType: 'PAYMENT',  referenceId: inv02.id, description: 'Advance payment received NEFT/HDFC/992831', date: makeDate(3) },
    { businessId: business.id, partyType: PartyType.CUSTOMER, partyId: custRajendra.id, entryType: EntryType.DEBIT, amount: 6844, balanceAfter: 6844, referenceType: 'INVOICE', referenceId: inv03.id, description: 'Invoice INV-2026-0003 raised', date: makeDate(5) },
    { businessId: business.id, partyType: PartyType.CUSTOMER, partyId: custRajendra.id, entryType: EntryType.CREDIT, amount: 6844, balanceAfter: 0, referenceType: 'PAYMENT', referenceId: inv03.id, description: 'Cheque payment received CHQ/SBI/00112233', date: makeDate(4) },
    { businessId: business.id, partyType: PartyType.CUSTOMER, partyId: custPriya.id, entryType: EntryType.DEBIT, amount: 10620, balanceAfter: 10620, referenceType: 'INVOICE', referenceId: inv07.id, description: 'Invoice INV-2026-0007 raised', date: makeDate(12) },
    { businessId: business.id, partyType: PartyType.CUSTOMER, partyId: custPriya.id, entryType: EntryType.CREDIT, amount: 10620, balanceAfter: 0, referenceType: 'PAYMENT', referenceId: inv07.id, description: 'Bank transfer received NEFT/AXIS/5589301', date: makeDate(11) },
  ]});

  // Supplier Ledger
  await prisma.ledgerEntry.createMany({ data: [
    { businessId: business.id, partyType: PartyType.SUPPLIER, partyId: supBharat.id, entryType: EntryType.CREDIT, amount: 29500, balanceAfter: 29500, referenceType: 'PURCHASE', referenceId: pur1.id, description: 'Purchase bill PUR-2026-0001', date: makeDate(20) },
    { businessId: business.id, partyType: PartyType.SUPPLIER, partyId: supBharat.id, entryType: EntryType.DEBIT, amount: 14500, balanceAfter: 15000, referenceType: 'PAYMENT', referenceId: pur1.id, description: 'Bank payment RTGS/ICICI/882101', date: makeDate(19) },
    { businessId: business.id, partyType: PartyType.SUPPLIER, partyId: supMetro.id, entryType: EntryType.CREDIT, amount: 14910, balanceAfter: 14910, referenceType: 'PURCHASE', referenceId: pur2.id, description: 'Purchase bill PUR-2026-0002', date: makeDate(15) },
    { businessId: business.id, partyType: PartyType.SUPPLIER, partyId: supMetro.id, entryType: EntryType.DEBIT, amount: 14910, balanceAfter: 0, referenceType: 'PAYMENT', referenceId: pur2.id, description: 'UPI payment PhonePe UPI/PhonePe/0099', date: makeDate(14) },
    { businessId: business.id, partyType: PartyType.SUPPLIER, partyId: supKapoor.id, entryType: EntryType.CREDIT, amount: 12320, balanceAfter: 12320, referenceType: 'PURCHASE', referenceId: pur3.id, description: 'Purchase bill PUR-2026-0003', date: makeDate(10) },
    { businessId: business.id, partyType: PartyType.SUPPLIER, partyId: supKapoor.id, entryType: EntryType.DEBIT, amount: 6820, balanceAfter: 5500, referenceType: 'PAYMENT', referenceId: pur3.id, description: 'Cash payment CASH/SUP/003', date: makeDate(9) },
  ]});

  console.log('✅ Ledger entries created');

  // ─────────────────────────────────────────────────────────────────────────
  // 14. EXPENSE CATEGORIES (5) & EXPENSES (12)
  // ─────────────────────────────────────────────────────────────────────────
  const expCatRent    = await prisma.expenseCategory.create({ data: { businessId: business.id, name: 'Shop Rent & Maintenance' } });
  const expCatUtil    = await prisma.expenseCategory.create({ data: { businessId: business.id, name: 'Electricity & Internet' } });
  const expCatStaff   = await prisma.expenseCategory.create({ data: { businessId: business.id, name: 'Staff Salaries & Welfare' } });
  const expCatLogi    = await prisma.expenseCategory.create({ data: { businessId: business.id, name: 'Transport & Logistics' } });
  const expCatMisc    = await prisma.expenseCategory.create({ data: { businessId: business.id, name: 'Miscellaneous & Petty Cash' } });

  await prisma.expense.createMany({ data: [
    { businessId: business.id, categoryId: expCatRent.id,  title: 'September 2026 Shop Rent',        amount: 22000, paymentMethod: PaymentMethod.BANK_TRANSFER, paymentDate: makeDate(2),  referenceNumber: 'NEFT/RENT/SEP26',      recipient: 'MG Road Property Owner' },
    { businessId: business.id, categoryId: expCatRent.id,  title: 'Shop Renovation – Painting',      amount: 8500,  paymentMethod: PaymentMethod.CASH,          paymentDate: makeDate(12), referenceNumber: 'CASH/RENO/001',        recipient: 'Ravi Painting Works' },
    { businessId: business.id, categoryId: expCatUtil.id,  title: 'MSEDCL Electricity Bill – Sep',   amount: 4250,  paymentMethod: PaymentMethod.UPI,           paymentDate: makeDate(5),  referenceNumber: 'UPI/MSEDCL/4431',      recipient: 'Maharashtra State Electricity' },
    { businessId: business.id, categoryId: expCatUtil.id,  title: 'Airtel Business Broadband – Sep', amount: 1799,  paymentMethod: PaymentMethod.UPI,           paymentDate: makeDate(3),  referenceNumber: 'UPI/Airtel/001199',     recipient: 'Airtel India Pvt Ltd' },
    { businessId: business.id, categoryId: expCatStaff.id, title: 'Staff Salaries – August 2026',    amount: 93500, paymentMethod: PaymentMethod.BANK_TRANSFER, paymentDate: makeDate(5),  referenceNumber: 'NEFT/SAL/AUG26',       recipient: 'All Employees – August Payroll' },
    { businessId: business.id, categoryId: expCatStaff.id, title: 'Staff Bonus – Ganesh Chaturthi',  amount: 10000, paymentMethod: PaymentMethod.CASH,          paymentDate: makeDate(10), referenceNumber: 'CASH/BON/009',          recipient: 'All Staff Members' },
    { businessId: business.id, categoryId: expCatStaff.id, title: 'Monthly Chai & Snacks',           amount: 1400,  paymentMethod: PaymentMethod.CASH,          paymentDate: makeDate(1),  referenceNumber: '',                     recipient: 'Kothrud Tea Stall' },
    { businessId: business.id, categoryId: expCatLogi.id,  title: 'Delivery Van Fuel – September',   amount: 6500,  paymentMethod: PaymentMethod.CASH,          paymentDate: makeDate(2),  referenceNumber: 'CASH/FUEL/SEP',        recipient: 'HP Petrol Pump, Hadapsar' },
    { businessId: business.id, categoryId: expCatLogi.id,  title: 'Courier Charges – Shipments',     amount: 2400,  paymentMethod: PaymentMethod.UPI,           paymentDate: makeDate(7),  referenceNumber: 'UPI/Delhivery/0023',   recipient: 'Delhivery Pvt Ltd' },
    { businessId: business.id, categoryId: expCatLogi.id,  title: 'Loading & Unloading Labour',      amount: 1800,  paymentMethod: PaymentMethod.CASH,          paymentDate: makeDate(8),  referenceNumber: 'CASH/LAB/002',         recipient: 'Daily Labour Workers' },
    { businessId: business.id, categoryId: expCatMisc.id,  title: 'Office Stationery & Printing',    amount: 850,   paymentMethod: PaymentMethod.CASH,          paymentDate: makeDate(4),  referenceNumber: 'CASH/STAT/003',        recipient: 'Ganpati Stationery Store' },
    { businessId: business.id, categoryId: expCatMisc.id,  title: 'GST Consultant Fees',             amount: 5000,  paymentMethod: PaymentMethod.BANK_TRANSFER, paymentDate: makeDate(6),  referenceNumber: 'NEFT/GST/CONSULT/001', recipient: 'CA Prashant Deshpande' },
  ]});

  console.log('✅ 12 Expenses created');

  // ─────────────────────────────────────────────────────────────────────────
  // 15. ADDITIONAL STOCK MOVEMENTS (Purchase & Sale events)
  // ─────────────────────────────────────────────────────────────────────────
  await prisma.stockMovement.createMany({ data: [
    { businessId: business.id, productId: p1.id,  type: StockMovementType.PURCHASE, quantity: 10, previousStock: 15, currentStock: 25, referenceType: 'PURCHASE', referenceId: pur1.id, notes: 'PUR-2026-0001 stock in', date: makeDate(20) },
    { businessId: business.id, productId: p6.id,  type: StockMovementType.PURCHASE, quantity: 5,  previousStock: 13, currentStock: 18, referenceType: 'PURCHASE', referenceId: pur1.id, notes: 'PUR-2026-0001 stock in', date: makeDate(20) },
    { businessId: business.id, productId: p1.id,  type: StockMovementType.SALE,     quantity: 1,  previousStock: 25, currentStock: 24, referenceType: 'INVOICE',  referenceId: inv01.id, notes: 'Sale INV-2026-0001', date: makeDate(1) },
    { businessId: business.id, productId: p2.id,  type: StockMovementType.SALE,     quantity: 1,  previousStock: 15, currentStock: 14, referenceType: 'INVOICE',  referenceId: inv02.id, notes: 'Sale INV-2026-0002', date: makeDate(3) },
    { businessId: business.id, productId: p12.id, type: StockMovementType.SALE,     quantity: 10, previousStock: 58, currentStock: 48, referenceType: 'INVOICE',  referenceId: inv04.id, notes: 'Sale INV-2026-0004', date: makeDate(6) },
    { businessId: business.id, productId: p7.id,  type: StockMovementType.ADJUSTMENT, quantity: 3, previousStock: 6, currentStock: 3, referenceType: 'ADJUSTMENT', notes: 'Physical count – damage write-off', date: makeDate(2) },
  ]});

  console.log('✅ Stock movements created');

  // ─────────────────────────────────────────────────────────────────────────
  // 16. NOTIFICATIONS & AUDIT LOG
  // ─────────────────────────────────────────────────────────────────────────
  await prisma.notification.createMany({ data: [
    { businessId: business.id, userId: businessOwner.id, title: 'Welcome to Khaki Karobari', message: 'Your business management platform is live. Start creating invoices!', type: 'SYSTEM' },
    { businessId: business.id, userId: businessOwner.id, title: '⚠️ Low Stock Alert', message: 'Khaki BT Card Reader is critically low (3 units). Minimum threshold: 5.', type: 'STOCK' },
    { businessId: business.id, userId: businessOwner.id, title: '💰 Payment Received', message: 'Mahindra Agri Solutions paid ₹26,550 for INV-2026-0006 via Bank Transfer.', type: 'PAYMENT' },
    { businessId: business.id, userId: businessOwner.id, title: '📦 Purchase Order Ordered', message: 'PUR-2026-0005 worth ₹8,260 placed with Prime Hardware Imports.', type: 'SYSTEM', isRead: true },
    { businessId: business.id, userId: businessOwner.id, title: '⏰ Invoice Overdue', message: 'INV-2026-0004 to City Convenience Store (₹4,137) is 6 days overdue.', type: 'INVOICE' },
  ]});

  await prisma.auditLog.create({
    data: {
      businessId: business.id,
      userId: superAdmin.id,
      action: 'INITIAL_SETUP',
      entity: 'BUSINESS',
      entityId: business.id,
      details: JSON.stringify({ message: 'Khaki Karobari platform initialized – v2 rich seed with 20 products, 12 customers, 6 suppliers, 12 invoices, 5 purchases, 12 expenses' }),
    },
  });

  console.log('\n🎉 Seed v2 completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦  Products:   20 (incl. 1 low-stock, 1 out-of-stock)');
  console.log('👥  Customers:  12');
  console.log('🏭  Suppliers:   6');
  console.log('🧾  Invoices:   12');
  console.log('🛒  Purchases:   5');
  console.log('💸  Payments:   13 (received + made)');
  console.log('💼  Expenses:   12');
  console.log('👔  Employees:   4');
  console.log('📋  Categories:  6');
  console.log('🏷️  Brands:      5');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Login → Phone: 9876543211 | Password: OwnerPassword@123');
  console.log('Admin → Phone: 9876543210 | Password: AdminPassword@123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

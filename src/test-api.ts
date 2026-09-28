import app from './app';
import http from 'http';

async function runTests() {
  console.log('🧪 Starting Khaki Karobari End-to-End API Test Suite...');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5099, resolve));
  const baseUrl = 'http://localhost:5099/api/v1';

  let adminToken = '';
  let businessId = '';
  let customerId = '';
  let productId = '';
  let invoiceId = '';

  try {
    // 1. Health check
    console.log('1️⃣ Testing /api/health...');
    const healthRes = await fetch('http://localhost:5099/api/health');
    const healthJson = (await healthRes.json()) as any;
    if (!healthRes.ok || healthJson.status !== 'healthy') throw new Error('Health check failed');
    console.log('  ✅ Health check passed:', healthJson.service);

    // 2. Auth Login (Super Admin)
    console.log('2️⃣ Testing Super Admin Login (/auth/login)...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '9876543210',
        password: 'AdminPassword@123',
      }),
    });
    const loginJson = (await loginRes.json()) as any;
    if (!loginRes.ok || !loginJson.data?.accessToken) throw new Error(`Login failed: ${JSON.stringify(loginJson)}`);
    adminToken = loginJson.data.accessToken;
    businessId = loginJson.data.activeBusiness?.id;
    console.log('  ✅ Login successful. Token received. Active business:', businessId);

    // 3. OTP Flow
    console.log('3️⃣ Testing OTP Request & Verify Flow (/auth/otp)...');
    const otpReqRes = await fetch(`${baseUrl}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9988776655', purpose: 'LOGIN' }),
    });
    const otpReqJson = await otpReqRes.json();
    if (!otpReqRes.ok) throw new Error('OTP Request failed');

    const otpVerRes = await fetch(`${baseUrl}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9988776655', otp: '123456', name: 'OTP Test User' }),
    });
    const otpVerJson = (await otpVerRes.json()) as any;
    if (!otpVerRes.ok || !otpVerJson.data?.accessToken) throw new Error('OTP Verify failed');
    console.log('  ✅ OTP Flow verified successfully. Auto-created user:', otpVerJson.data.user.name);

    // 4. Products List & Inventory
    console.log('4️⃣ Testing Products & Inventory APIs...');
    const prodRes = await fetch(`${baseUrl}/products`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-business-id': businessId,
      },
    });
    const prodJson = (await prodRes.json()) as any;
    if (!prodRes.ok || prodJson.data.items.length === 0) throw new Error('Product list failed');
    const targetProduct = prodJson.data.items.find((p: any) => !p.isService) || prodJson.data.items[0];
    productId = targetProduct.id;
    console.log(`  ✅ Retrieved ${prodJson.data.items.length} products. Selected physical product: ${targetProduct.name} (Stock: ${targetProduct.currentStock})`);

    // 5. Customer Creation & Search
    console.log('5️⃣ Testing Customer Module...');
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const custCreateRes = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-business-id': businessId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Sharma Traders & Co.',
        phone: testPhone,
        email: 'sharma@example.com',
        city: 'Pune',
        state: 'Maharashtra',
        stateCode: '27',
        openingBalance: 500,
      }),
    });
    const custJson = (await custCreateRes.json()) as any;
    if (!custCreateRes.ok) throw new Error(`Customer creation failed: ${JSON.stringify(custJson)}`);
    customerId = custJson.data.id;
    console.log('  ✅ Customer created:', custJson.data.name, 'with ID:', customerId);

    // 6. Create Real Invoice (With GST calculation & stock deduction)
    console.log('6️⃣ Testing Invoice Creation (Sales + GST + Stock reduction)...');
    const initialProductStock = Number(targetProduct.currentStock);
    const invoiceRes = await fetch(`${baseUrl}/invoices`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-business-id': businessId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        items: [
          {
            productId,
            quantity: 2,
            unitPrice: 2500,
            discountPercent: 10,
            gstRate: 18,
          },
        ],
        initialPayment: {
          amount: 2000,
          paymentMethod: 'UPI',
          referenceNumber: 'UPI/TEST/9901',
        },
      }),
    });
    const invJson = (await invoiceRes.json()) as any;
    if (!invoiceRes.ok) throw new Error(`Invoice creation failed: ${JSON.stringify(invJson)}`);
    invoiceId = invJson.data.id;
    console.log(`  ✅ Invoice ${invJson.data.invoiceNumber} created. Grand Total: ₹${invJson.data.grandTotal}, Paid: ₹${invJson.data.paidAmount}, Balance: ₹${invJson.data.balanceAmount}`);

    // Verify stock was reduced by exactly 2
    const verifyProdRes = await fetch(`${baseUrl}/products/${productId}`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'x-business-id': businessId },
    });
    const verifyProdJson = (await verifyProdRes.json()) as any;
    const newStock = Number(verifyProdJson.data.currentStock);
    if (newStock !== initialProductStock - 2) {
      throw new Error(`Stock mismatch: Expected ${initialProductStock - 2}, got ${newStock}`);
    }
    console.log(`  ✅ Stock successfully reduced from ${initialProductStock} to ${newStock} via atomic transaction!`);

    // 7. Test Payment Module (Receive remaining balance)
    console.log('7️⃣ Testing Payment Module...');
    const payRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-business-id': businessId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'RECEIVED',
        partyType: 'CUSTOMER',
        customerId,
        invoiceId,
        amount: Number(invJson.data.balanceAmount),
        paymentMethod: 'CASH',
        notes: 'Full clearance payment',
      }),
    });
    const payJson = (await payRes.json()) as any;
    if (!payRes.ok) throw new Error(`Payment failed: ${JSON.stringify(payJson)}`);
    console.log(`  ✅ Payment of ₹${payJson.data.amount} recorded. Ledgers and invoice status updated.`);

    // 8. Test Customer Ledger
    console.log('8️⃣ Testing Customer Ledger...');
    const ledgerRes = await fetch(`${baseUrl}/customers/${customerId}/ledger`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'x-business-id': businessId },
    });
    const ledgerJson = (await ledgerRes.json()) as any;
    if (!ledgerRes.ok || ledgerJson.data.entries.length === 0) throw new Error('Customer ledger failed');
    console.log(`  ✅ Customer ledger contains ${ledgerJson.data.entries.length} entries. Current Balance: ₹${ledgerJson.data.customer.currentBalance}`);

    // 9. Test Accounting & Daybook
    console.log('9️⃣ Testing Accounting Daybook & Cashbook...');
    const daybookRes = await fetch(`${baseUrl}/accounting/day-book`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'x-business-id': businessId },
    });
    const daybookJson = (await daybookRes.json()) as any;
    if (!daybookRes.ok) throw new Error('Daybook failed');
    console.log(`  ✅ Daybook retrieved: ${daybookJson.data.invoices.length} invoices, ${daybookJson.data.payments.length} payments today.`);

    // 10. Test GST Reports
    console.log('🔟 Testing GST GSTR-1 & GSTR-3B Computation...');
    const gstr1Res = await fetch(`${baseUrl}/gst/gstr-1`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'x-business-id': businessId },
    });
    const gstr1Json = (await gstr1Res.json()) as any;
    if (!gstr1Res.ok) throw new Error('GSTR-1 failed');
    console.log(`  ✅ GSTR-1 Outward Supplies: Taxable ₹${gstr1Json.data.totalOutwardSupplies.taxableValue}, Total Tax ₹${gstr1Json.data.totalOutwardSupplies.totalTax}`);

    // 11. Test Reports & Dashboard
    console.log('1️⃣1️⃣ Testing Business Dashboard Metrics...');
    const dashRes = await fetch(`${baseUrl}/reports/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'x-business-id': businessId },
    });
    const dashJson = (await dashRes.json()) as any;
    if (!dashRes.ok) throw new Error('Dashboard report failed');
    console.log(`  ✅ Dashboard: Today's Sales: ₹${dashJson.data.todaySales}, Receivables: ₹${dashJson.data.totalReceivables}, Cash: ₹${dashJson.data.cashBalance}`);

    // 12. Test Admin Dashboard (Platform-Wide)
    console.log('1️⃣2️⃣ Testing Admin Platform Dashboard...');
    const adminDashRes = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminDashJson = (await adminDashRes.json()) as any;
    if (!adminDashRes.ok) throw new Error(`Admin dashboard failed: ${JSON.stringify(adminDashJson)}`);
    console.log(`  ✅ Admin Dashboard: Total Businesses: ${adminDashJson.data.overview.totalBusinesses}, Total Users: ${adminDashJson.data.overview.totalUsers}, Total Sales: ₹${adminDashJson.data.overview.totalSales}`);

    // 13. Test WhatsApp Service Integration
    console.log('1️⃣3️⃣ Testing WhatsApp Dispatch...');
    const waRes = await fetch(`${baseUrl}/whatsapp/share-invoice`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-business-id': businessId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invoiceId }),
    });
    const waJson = (await waRes.json()) as any;
    if (!waRes.ok) throw new Error('WhatsApp sharing failed');
    console.log(`  ✅ WhatsApp invoice sharing dispatched successfully (simulated: ${waJson.data.simulated}, msgId: ${waJson.data.messageId})`);

    console.log('\n======================================================');
    console.log('🎉 ALL 13 E2E BACKEND SUITE TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('\n❌ Test Suite Failed:', err.message);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env';
import { errorHandler } from './middleware/error.middleware';

// Routes
import authRoutes from './modules/auth/auth.routes';
import businessRoutes from './modules/businesses/business.routes';
import customerRoutes from './modules/customers/customer.routes';
import supplierRoutes from './modules/suppliers/supplier.routes';
import productRoutes from './modules/products/product.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import invoiceRoutes from './modules/invoices/invoice.routes';
import purchaseRoutes from './modules/purchases/purchase.routes';
import paymentRoutes from './modules/payments/payment.routes';
import expenseRoutes from './modules/expenses/expense.routes';
import accountingRoutes from './modules/accounting/accounting.routes';
import gstRoutes from './modules/gst/gst.routes';
import reportRoutes from './modules/reports/report.routes';
import employeeRoutes from './modules/employees/employee.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes';
import adminRoutes from './modules/admin/admin.routes';

const app: Express = express();

// Security & Utility Middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, flutter)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (ENV.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Khaki Karobari API',
    brand: 'KHAKI | KrypTech™',
  });
});

// Versioned APIs (v1)
const v1 = express.Router();

v1.use('/auth', authRoutes);
v1.use('/businesses', businessRoutes);
v1.use('/customers', customerRoutes);
v1.use('/suppliers', supplierRoutes);
v1.use('/products', productRoutes);
v1.use('/inventory', inventoryRoutes);
v1.use('/invoices', invoiceRoutes);
v1.use('/purchases', purchaseRoutes);
v1.use('/payments', paymentRoutes);
v1.use('/expenses', expenseRoutes);
v1.use('/accounting', accountingRoutes);
v1.use('/gst', gstRoutes);
v1.use('/reports', reportRoutes);
v1.use('/employees', employeeRoutes);
v1.use('/notifications', notificationRoutes);
v1.use('/whatsapp', whatsappRoutes);
v1.use('/admin', adminRoutes);

app.use('/api/v1', v1);

// Global Error Handler
app.use(errorHandler);

export default app;

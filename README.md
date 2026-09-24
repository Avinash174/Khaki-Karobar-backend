# Khaki Karobari — Enterprise Backend Engine

> **Company:** KHAKI | KrypTech™  
> **Legal Name:** Khaki KrypTech (India) Pvt. Ltd.  
> **Brand Identity:** White + Red + Black

Core enterprise backend engine for **Khaki Karobari** — power-billing, multi-branch inventory, double-entry accounting, statutory GST compliance, multi-tenant customer/supplier CRM, and WhatsApp Cloud integration.

---

## Architecture & Technology Stack

- **Runtime:** Node.js (v18+) with TypeScript
- **Web Framework:** Express.js
- **Database:** PostgreSQL (Active database: `khaki_karobari`)
- **ORM & Migrations:** Prisma ORM (23 relational models)
- **Authentication:** JWT (Access & Refresh tokens) + Multi-tenant Role-Based Access Control (RBAC) + OTP verification
- **Messaging Service:** Official WhatsApp Cloud API integration
- **Port:** `5001` (Configured via `PORT=5001` in `.env`)

---

## Core System Modules

1. **Authentication & Identity (`/api/v1/auth`):**
   - JWT tokens, password hashing via bcrypt, 6-digit OTP verification, session refresh.
   - RBAC roles: `SUPER_ADMIN`, `BUSINESS_OWNER`, `MANAGER`, `CASHIER`, `ACCOUNTANT`.
2. **Multi-Tenant Businesses (`/api/v1/businesses`):**
   - Multi-branch hierarchy, business settings, tax registration, GSTIN verification.
3. **Smart Invoicing & Billing (`/api/v1/invoices`):**
   - Atomic database transactions with row-level locking for instant stock deduction.
   - Automated CGST, SGST, and IGST computations with fractional rounding.
4. **Inventory Management (`/api/v1/products`):**
   - Multi-unit tracking (PCS, KG, BOX, MTR, SET), low-stock alert triggers, barcode scanning.
5. **Customer & Supplier CRM (`/api/v1/customers`, `/api/v1/suppliers`):**
   - Complete party directories, credit ledger profiles, opening and current due balances.
6. **Accounting & Ledgers (`/api/v1/accounting`):**
   - Automatic double-entry Day Book, Cash Book, Bank Book, and Profit & Loss generation.
7. **GST Statutory Compliance (`/api/v1/gst`):**
   - Ready-to-file GSTR-1 (B2B and B2C supply breakdown) and GSTR-3B tax summaries.
8. **WhatsApp Cloud Dispatch (`/api/v1/whatsapp`):**
   - One-click PDF invoice and payment receipt delivery directly to customers.

---

## Getting Started

### 1. Environment Configuration
Copy `.env.example` to `.env` and configure your database URI:
```bash
cp .env.example .env
```

Example configuration:
```env
PORT=5001
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/khaki_karobari?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
```

### 2. Database Migration & Prisma Client
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Run Database Seed
```bash
npx tsx prisma/seed.ts
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Run End-to-End Test Suite
```bash
npx tsx src/test-api.ts
```

---

## Health Check Endpoint

```http
GET http://localhost:5001/api/health
```

Response:
```json
{
  "status": "healthy",
  "service": "Khaki Karobari API",
  "version": "1.0.0",
  "timestamp": "2026-09-24T06:40:00.000Z"
}
```

---

© 2026 Khaki KrypTech (India) Pvt. Ltd. All rights reserved.

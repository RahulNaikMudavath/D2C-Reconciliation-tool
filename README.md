# ReconcileX - D2C Reconciliation Tool

An automated financial reconciliation engine built for Direct-to-Consumer (D2C) brands to identify payment leakages, freight overcharges, return discrepancies, and manage partner disputes.

---

## 🚀 Features

- **Multi-Source Ingestion**: Flexible import of orders, payment gateway settlements, courier freight invoices, COD remittances, and warehouse return slips.
- **Smart Column Mapping**: Dynamic mapping for custom CSV/Excel reports from logistics and marketplace partners.
- **Automated Reconciliation**:
  - **Payment Reconciliation**: Matches expected order value against actual payment gateway / marketplace settlement. Identifies short payments and unpaid orders.
  - **Freight Audit**: Compares actual courier charged weight vs. dimensional/expected weight based on rate cards to detect freight overcharges.
  - **Return & NDR Tracking**: Tracks return orders against warehouse inward logs to catch missing return inventory.
- **Dispute & Claims Management**: Generates automated dispute dossiers and evidence reports with AI integration (Gemini) for courier and gateway recovery.
- **Role-Based Access & Audit Logs**: Detailed audit trails for financial compliance and accountability.

---

## 🛠️ Architecture & Tech Stack

### Backend (`/server`)
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma (with `@prisma/adapter-pg`)
- **Validation**: Zod
- **File Processing**: ExcelJS, csv-parse, Multer
- **AI**: `@google/genai` (Gemini API)

### Frontend (`/client`)
- **Framework**: React
- **Build Tool**: Vite
- **Styling**: Modern CSS / Responsive UI

---

## 📂 Project Structure

```
├── client/                 # React frontend application
│   ├── public/             # Static assets and icons
│   ├── src/                # UI components and app logic
│   ├── package.json
│   └── vite.config.js
├── server/                 # Express backend & Prisma database
│   ├── prisma/             # Schema definitions and migrations
│   ├── src/
│   │   └── config/         # Database and environment configurations
│   ├── .env.example        # Environment variable template
│   └── package.json
└── README.md
```

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL running locally or in the cloud

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run db:migrate
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

---

## 📄 License
ISC

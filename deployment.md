# ReconcileX — Deployment & Operations Guide

**Project:** D2C Home Brand's Order, Payment and Return Reconciliation Tool  
**GitHub Repository:** [https://github.com/RahulNaikMudavath/D2C-Reconciliation-tool](https://github.com/RahulNaikMudavath/D2C-Reconciliation-tool)  
**Live Application URL:** [https://reconcilex.onrender.com](https://reconcilex.onrender.com)  
**File:** `deployment.md`  

---

## 1. Demo Reviewer Login Credentials

Pre-configured credentials for evaluation on both the live cloud app and local environments:

### Primary Reviewer Account (Finance Executive)
* **Email:** `demo@reconcilex.com`
* **Password:** `Password123!`
* **Role:** `FINANCE_EXECUTIVE`
* **Permissions:** Full access to Executive Dashboard, Universal Multi-Source Imports, AI Column Mappings & Approvals, 3-Way Order Reconciliation, and Financial Dispute Claims.

### Co-Founder Account (Executive Audit & Governance)
* **Email:** `cofounder@reconcilex.com`
* **Password:** `Password123!`
* **Role:** `CO_FOUNDER`
* **Permissions:** Strategic financial oversight, courier & channel rate-card configuration, and immutable system audit logs.

*(Note: Reviewers can also click "Create an account" on the login screen to register a fresh user profile anytime.)*

---

## 2. Required Environment Variables (Names Only)

In strict accordance with security standards, only environment variable names and their functional roles are listed. **No secrets or credentials are included.**

### Backend Environment Variables (`server/.env`)
* `PORT` — Network port number on which Express listens (default: `5000` locally, auto-assigned by Render).
* `CLIENT_URL` — Origin URL of the React client (configured in CORS security policies).
* `DATABASE_URL` — PostgreSQL connection string URI (protocol, host, port, credentials, database name, and SSL mode).
* `JWT_SECRET` — Cryptographic secret key used to sign and verify JSON Web Tokens.
* `NODE_ENV` — Runtime environment mode (`development` or `production`).
* `GEMINI_API_KEY` — Google Gemini API key utilized by the AI Column Mapping Service for header matching.
* `ADMIN_SETUP_KEY` — Secret key required for initializing the initial Co-Founder account.

### Frontend Environment Variables (`client/.env`)
* `VITE_API_URL` — Base HTTP URL of backend API endpoints consumed by Axios (omit or leave empty in production for unified same-origin serving).

---

## 3. Local Quick Start (Step-by-Step)

### Prerequisites
* **Node.js:** v18.0.0 or higher (v20+ / v24 recommended)
* **PostgreSQL:** v14 or higher running locally or accessible via network
* **Git**

### Step 1: Clone the Repository
```bash
git clone https://github.com/RahulNaikMudavath/D2C-Reconciliation-tool.git
cd D2C-Reconciliation-tool
```

### Step 2: Install Backend & Frontend Dependencies
```bash
# Install root, backend and frontend dependencies
npm run build
```
*(Or install manually: `cd server && npm install && cd ../client && npm install && cd ..`)*

### Step 3: Configure Environment Files
1. Create `server/.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reconcilex?schema=public
   JWT_SECRET=your_jwt_secret_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ADMIN_SETUP_KEY=your_admin_setup_key_here
   ```
2. Create `client/.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

### Step 4: Initialize the Database with Migrations & Seed Data
```bash
cd server

# Apply database migrations
npx prisma migrate dev --name init

# Seed realistic 1,250-order D2C dataset, rate cards, and demo accounts
npm run db:seed
```

### Step 5: Start the Backend Server
```bash
cd server
npm start
# The backend initializes on http://localhost:5000
```

### Step 6: Start the Frontend Client
In a separate terminal:
```bash
cd client
npm run dev
# The React application initializes on http://localhost:5173
```

---

## 4. How the Application Is Deployed Live on Render

ReconcileX includes an automated Infrastructure-as-Code Blueprint (`render.yaml`) that configures both a managed PostgreSQL database and a unified full-stack Node.js web service on [Render](https://render.com).

### Live Architecture
* **Single Unified Web Service:** The production Express server statically serves the compiled Vite React single-page application (`client/dist`) while simultaneously powering all `/api/*` REST endpoints under one unified domain. This eliminates cross-origin latency, cookie restrictions, and CORS preflight overhead.
* **Database:** Managed cloud PostgreSQL instance with encrypted SSL (`ssl: { rejectUnauthorized: false }`) and connection pooling.
* **Automated CI/CD:** Auto-Deploy is enabled (`autoDeploy: true`) on the `main` branch. Every push to GitHub immediately triggers a clean rebuild and zero-downtime deployment.

### 2-Minute 1-Click Render Deployment Instructions
1. Navigate to **[dashboard.render.com](https://dashboard.render.com)** and log in with your GitHub account.
2. Click **New +** in the top navigation bar and select **Blueprint**.
3. Select the repository: **`RahulNaikMudavath/D2C-Reconciliation-tool`**.
4. Render automatically parses `render.yaml` and provisions:
   - **Database (`reconcilex-db`):** Managed PostgreSQL instance with auto-injected `DATABASE_URL`.
   - **Web Service (`reconcilex`):** Node.js service executing `npm run build` (builds the React client and Prisma client) and `npm start` (runs migrations, seeds demo accounts, and starts Express on `0.0.0.0`).
5. (Optional) In the Render dashboard under `reconcilex` Environment Variables, add your `GEMINI_API_KEY` for live Google Gemini AI column mapping suggestions.
6. Click **Apply Blueprint**. Render builds and provisions the live service in ~3 minutes.

---

## 5. Pre-Seeded Realistic Demo Dataset

To ensure reviewers do not arrive at an empty workspace, ReconcileX is pre-seeded with a **balanced, production-grade 1,250-order D2C multi-channel dataset**:

* **Total Orders:** 1,250 orders spanning the past 30 days across Amazon (45%), Flipkart (25%), Shopify (15%), and D2C Website (15%).
* **Expected Settlement:** ~₹29,61,244.40 based on contracted channel commission rate cards.
* **Amount Received:** ~₹26,43,487.39 remitted across marketplaces and payment gateways.
* **Financial Leakage Identified:** ~₹77,625.07 at risk:
  - **Short-Payments (7.5% — 94 orders):** Marketplace deducted uncontracted penalty fees; dispute claims automatically opened.
  - **Unpaid Past Due (2.2% — 27 orders):** Delivered > 14 days ago with zero remittance; flagged for urgent recovery.
  - **Courier Freight Overcharges (40 shipments):** Billed weight exceeded actual weight; courier dispute claims generated.
  - **Lost Returns (13 orders):** Customer returns in-transit > 7 days lacking warehouse inward scans.
* **Dispute Claims:** 144 active dispute claims complete with order numbers, tracking AWBs, invoices, and deduction codes.
* **Column Mappings:** 3 approved production templates + 1 pending review template so reviewers can test approving and rejecting in real time.

---

## 6. Automated Verification & Testing

Execute the automated test suites to verify integrity across arithmetic, claims, and edge cases:

```bash
cd server

# 1. Run Column Mapping & Strict Date Precedence Regression Suite
node test/column_mapping_dates.test.mjs

# 2. Run Claims Integrity & False-Claim Invalidation Suite
node test/claims_integrity.test.mjs

# 3. Run Full End-to-End System Health Check
node test/e2e_system_check.test.mjs

# 4. Run 100,000-Record Ingestion Benchmark (Demonstrates high-throughput scale under 60s)
cd ..
node scripts/benchmark_100k.mjs
```

# ReconcileX — Deployment & Operations Guide

**Project:** D2C Home Brand's Order, Payment and Return Reconciliation Tool  
**GitHub Repository:** [https://github.com/RahulNaikMudavath/D2C-Reconciliation-tool](https://github.com/RahulNaikMudavath/D2C-Reconciliation-tool)  
**File:** `deployment.md`  

---

## 1. Demo Reviewer Login Credentials

Pre-configured demo credentials for testing and evaluation:

### Primary Reviewer Account (Finance Executive)
* **Email:** `demo@reconcilex.com`
* **Password:** `Password123!`
* **Role:** `FINANCE_EXECUTIVE` (Full access to Dashboard, Universal Imports, Column Mappings, 3-Way Reconciliation, and Claims Dispute Management)

### Co-Founder Account (Executive Audit & Rate Card Settings)
* **Email:** `cofounder@reconcilex.com`
* **Password:** `Password123!`
* **Role:** `CO_FOUNDER` (Executive oversight, rate-card configuration, and system audit logs)

*(Note: Reviewers can also click "Create an account" on the login screen to register a new account anytime.)*

---

## 2. Required Environment Variables (Names Only)

In accordance with strict security standards, only the environment variable names and their purposes are documented below. **No secret or credential values are included.**

### Backend Environment Variables (`server/.env`)
* `PORT` — The network port number on which the Express API server listens.
* `CLIENT_URL` — The origin URL of the React client application (configured in CORS middleware).
* `DATABASE_URL` — The PostgreSQL connection string URI (including protocol, host, port, credentials, database name, and schema).
* `JWT_SECRET` — Cryptographic secret key used to sign and verify JSON Web Tokens.
* `NODE_ENV` — Runtime environment mode (`development` or `production`).
* `GEMINI_API_KEY` — Google Gemini API key utilized by the AI Column Mapping Service.
* `ADMIN_SETUP_KEY` — Secret key required for initializing the initial Co-Founder account.

### Frontend Environment Variables (`client/.env`)
* `VITE_API_URL` — The base HTTP URL of the backend API endpoints consumed by Axios.

---

## 3. Local Quick Start (Step-by-Step)

### Step 1: Clone the Repository
```bash
git clone https://github.com/RahulNaikMudavath/D2C-Reconciliation-tool.git
cd D2C-Reconciliation-tool
```

### Step 2: Install Backend & Frontend Dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
cd ..
```

### Step 3: Configure Environment Files
1. Copy or create `server/.env` defining the required backend variables (`PORT`, `CLIENT_URL`, `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `GEMINI_API_KEY`, `ADMIN_SETUP_KEY`).
2. Copy or create `client/.env` defining `VITE_API_URL`.

### Step 4: Initialize the Database with Prisma
Ensure your PostgreSQL instance is running, then apply migrations:
```bash
cd server
npx prisma generate
npx prisma migrate dev --name init
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

## 4. How the Application Is Deployed

ReconcileX is architected as a decoupled, 12-factor cloud-native application:

### A. Production Container Deployment (Docker & Docker Compose)
* **Web Client (`client`):** Multi-stage Docker build with Node.js compiling static assets into an optimized production bundle, served by an Nginx reverse-proxy container handling SPA routing (`try_files $uri /index.html`).
* **API Service (`server`):** Node.js container executing Express 5 behind Helmet security middleware and CORS protections, connecting to PostgreSQL via Prisma ORM connection pooling.
* **Database (`postgres`):** PostgreSQL 16 container with persistent volume mounts for enterprise durability.

### B. Cloud Platform Deployment (e.g. AWS / Render / Railway / Supabase)
1. **Managed PostgreSQL:** Hosted on AWS RDS or Supabase. Migrations are executed in the CI/CD pipeline using `npx prisma migrate deploy`.
2. **Backend API Service:** Containerized web service on Render/Railway. Health checks query `/api/health`.
3. **Frontend Static CDN:** Static assets deployed to Vercel, Netlify, or Cloudflare Pages with single-page application rewrite rules.

---

## 5. Automated Verification & Testing

Execute the automated test suites to verify integrity:

```bash
cd server

# 1. Run Column Mapping & Strict Date Precedence Regression Suite
node test/column_mapping_dates.test.mjs

# 2. Run Claims Integrity & False-Claim Invalidation Suite
node test/claims_integrity.test.mjs

# 3. Run 100,000-Record Ingestion Benchmark
cd ..
node scripts/benchmark_100k.mjs
```

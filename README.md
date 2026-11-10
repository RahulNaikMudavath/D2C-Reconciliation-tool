# ReconcileX – Intelligent D2C Financial Reconciliation Platform

**Live Production App:** [https://reconcilex.onrender.com](https://reconcilex.onrender.com)  
**GitHub Repository:** [https://github.com/RahulNaikMudavath/D2C-Reconciliation-tool](https://github.com/RahulNaikMudavath/D2C-Reconciliation-tool)  
**Deployment Guide:** [deployment.md](./deployment.md)  
**Technical Design Document:** [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md)  

ReconcileX is a financial reconciliation platform designed for Direct-to-Consumer (D2C) businesses. It helps finance teams identify settlement discrepancies, freight overcharges, missing return receipts and potential financial leakages across sales and logistics partners.

The platform combines automated reconciliation, configurable rate cards, AI-assisted column mapping, claims management and financial reporting in one dashboard.

## Key Features

### 1. Multi-Source File Import
- Import order, settlement, COD, freight, return and warehouse receipt files.
- Supports CSV and Excel file processing.
- Normalizes different partner-specific column formats.
- Validates imported records and identifies invalid or duplicate entries.
- Maintains import history and processing status.

### 2. AI-Powered Column Mapping
- Uses Google Gemini API to suggest mappings between uploaded spreadsheet headers and standard ReconcileX fields.
- Provides confidence scores and explanations for suggestions.
- Includes pattern-matching fallback when AI is unavailable.
- Requires human approval before suggested mappings are accepted.
- Supports settlement fields including TCS and TDS.

### 3. Automated Financial Reconciliation
- Matches settlement records against expected order-level amounts.
- Identifies settled, short-paid, unpaid past-due and review-required transactions.
- Applies a configurable ₹10 discrepancy threshold.
- Uses decimal-based monetary calculations to reduce floating-point errors.
- Handles overpayments through manual review rather than automatically generating recovery claims.

### 4. Freight Audit
- Compares actual courier charges against applicable rate-card calculations.
- Supports courier, shipment weight and invoice information.
- Identifies freight overcharges.
- Separately tracks expected freight, actual freight and discrepancies.

### 5. Returns and Warehouse Verification
- Imports return records and warehouse receipt files.
- Links return records to orders.
- Tracks warehouse receipt timestamps.
- Flags returns requiring warehouse verification.
- Handles ambiguous receipt matching through manual review.

### 6. Claims Management
- Generates claims for eligible settlement and freight discrepancies.
- Prevents duplicate recovery claims.
- Maintains claim evidence and reconciliation references.
- Supports claim status updates and owner assignment.
- Provides partner-wise claim summaries.

### 7. Financial Dashboard
- Displays order and reconciliation summaries.
- Tracks settlement and freight money at risk.
- Shows partner-wise leakage.
- Reports TCS and TDS separately.
- Provides claim counts and claim values.

### 8. Security and Access Control
- JWT-based authentication.
- Password hashing using bcrypt.
- Finance Executive and Co-founder roles.
- Role-based route authorization.
- Audit logging.
- Security headers and API rate limiting.
- Server-side storage of Gemini API credentials.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| AI Integration | Google Gemini API |
| Authentication | JWT, bcryptjs |
| File Processing | Multer, ExcelJS, csv-parse |
| Validation | Zod |
| Monetary Calculations | Decimal.js |
| Security | Helmet, express-rate-limit |
| API Communication | Axios |

## Architecture

ReconcileX follows a modular full-stack architecture.

- **Frontend:** React application for authentication, imports, dashboard, reconciliation, claims and mapping management.
- **Backend:** Express REST API handling authentication, file processing, business logic and authorization.
- **Database:** PostgreSQL for orders, settlements, rate cards, reconciliation results, claims, imports and audit logs.
- **AI Service:** Gemini-assisted mapping suggestions with a deterministic fallback mechanism.
- **Reconciliation Engine:** Order-level financial matching and discrepancy detection.

AI-generated suggestions are treated as recommendations. Financial records and approved mappings are not automatically changed by AI.

## Project Structure

```text
reconcilex/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── imports/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   └── utils/
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

## Installation and Setup

### Prerequisites

- Node.js 18 or later.
- npm.
- PostgreSQL.
- Google Gemini API key for live AI-powered mapping.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd reconcilex
```

### 2. Configure the Backend

```bash
cd server
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Configure the following variables in `server/.env`:

```env
PORT=5000
NODE_ENV=development

DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/reconcilex"

JWT_SECRET=your_long_random_secret
GEMINI_API_KEY=your_gemini_api_key

CLIENT_URL=http://localhost:5173
ADMIN_SETUP_KEY=your_private_setup_secret
```

Create the PostgreSQL database named `reconcilex` before running migrations.

### 3. Generate Prisma Client and Run Migrations

```bash
npm run db:generate
npm run db:migrate
```

Optional database inspection:

```bash
npm run db:studio
```

### 4. Start the Backend

```bash
npm run dev
```

Backend default address:

`http://localhost:5000`

### 5. Configure and Start the Frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Frontend default address:

`http://localhost:5173`

Ensure the frontend API configuration in `client/src/services/api.js` points to the running backend.

## Authentication and Roles

ReconcileX supports two application roles:

**Finance Executive**
- Import and process financial files.
- Review reconciliation results.
- Manage claims.
- Review and approve column mappings.

**Co-founder**
- Access financial and management dashboards.
- Review reconciliation and claims.
- Access authorized administrative functionality.

New public registrations do not grant privileged roles. The initial Co-founder setup mechanism is intended for development and must remain disabled in production.

## Reconciliation Workflow

1. Upload order, settlement, freight, COD or return files.
2. Normalize and validate incoming records.
3. Generate AI-assisted column mapping suggestions when required.
4. Review and approve mapping suggestions.
5. Process imported records.
6. Configure or apply applicable rate cards.
7. Execute reconciliation.
8. Review discrepancies and exceptions.
9. Generate eligible claims.
10. Track claim status, evidence and partner-wise recovery amounts.

## Testing and Validation

The backend contains individual Node.js verification scripts for core business logic.

Run the available checks from the `server` directory:

```bash
node src/test-money.js
node src/test-reconciliation.js
node src/test-column-normalizer.js
node src/test-import-validator.js
node src/test-settlement-processing.js
node src/test-freight-mapping.js
node src/test-freight-validator.js
```

Frontend production build:

```bash
cd client
npm run build
```

Note: The backend's current `npm test` script invokes Jest, but an application-level Jest test suite has not yet been configured. The individual Node.js scripts above are the existing verification tests.

## Security Considerations

- Never commit `.env` files or API credentials.
- Keep the Gemini API key on the backend.
- Use a strong JWT secret.
- Configure production CORS origins appropriately.
- Disable development-only Co-founder setup functionality in production.
- Use HTTPS in deployed environments.
- Restrict database access to trusted services.

## Current Scope and Assumptions

- External marketplace, courier and payment integrations are represented through imported files and sample data.
- AI suggestions require human approval.
- Ambiguous reconciliation cases require manual review.
- Return records are verified against warehouse receipt imports.
- Tax amounts are reported separately and are not treated as recoverable leakage.
- Automated GST filing and automatic partner claim submission are outside the current scope.

## License

ISC

import prisma from "./config/database.js";
import bcrypt from "bcryptjs";
import Decimal from "decimal.js";
import { runReconciliation } from "./services/reconciliationRepository.js";
import { generateClaims } from "./services/claimService.js";

const daysFromNow = (days) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

export async function seedDatabase() {
  console.log("=== SEEDING RECONCILEX REALISTIC D2C DATASET ===");

  // 1. Clean up legacy operational data instantly via TRUNCATE CASCADE
  console.log("1. Cleaning up operational data via fast TRUNCATE CASCADE...");
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "AuditLog",
      "Claim", 
      "MatchSettlement", 
      "ReconciliationMatch", 
      "ReconciliationRun", 
      "ReturnRecord", 
      "FreightCharge", 
      "Settlement", 
      "Order", 
      "ColumnMapping", 
      "SourceRecord", 
      "ImportBatch" 
    CASCADE;
  `);
  console.log("✓ Cleared prior operational data cleanly in milliseconds.");

  // 2. Seed Partners
  console.log("2. Seeding Multi-Channel Partners...");
  const partnersData = [
    { name: "Amazon", type: "MARKETPLACE" },
    { name: "Flipkart", type: "MARKETPLACE" },
    { name: "Shopify", type: "DIRECT_CHANNEL" },
    { name: "D2C Website", type: "DIRECT_CHANNEL" },
  ];

  const partnerMap = new Map();
  for (const p of partnersData) {
    let partner = await prisma.partner.findFirst({
      where: { name: p.name },
    });
    if (!partner) {
      partner = await prisma.partner.create({ data: p });
    }
    partnerMap.set(p.name, partner);
  }
  console.log("✓ Partners ready (Amazon, Flipkart, Shopify, D2C Website).");

  // 3. Seed Default Reviewer Accounts
  console.log("3. Seeding Reviewer & Executive User Accounts...");
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const usersData = [
    {
      name: "Demo Finance Executive",
      email: "demo@reconcilex.com",
      passwordHash,
      role: "FINANCE_EXECUTIVE",
    },
    {
      name: "Demo Co-Founder",
      email: "cofounder@reconcilex.com",
      passwordHash,
      role: "CO_FOUNDER",
    },
  ];

  const userMap = new Map();
  for (const u of usersData) {
    let user = await prisma.user.findUnique({
      where: { email: u.email },
    });
    if (!user) {
      user = await prisma.user.create({ data: u });
    }
    userMap.set(u.email, user);
  }
  const execUser = userMap.get("demo@reconcilex.com");
  console.log("✓ Users ready (demo@reconcilex.com, cofounder@reconcilex.com).");

  // 4. Seed Channel Commission Rate Cards
  console.log("4. Seeding Channel Commission Rate Cards...");
  await prisma.channelRateCard.deleteMany({});
  const channelRateCards = [
    {
      channel: "Amazon",
      partnerId: partnerMap.get("Amazon").id,
      commissionPercent: new Decimal(12.0),
      fixedFee: new Decimal(15.0),
      otherFee: new Decimal(5.0),
      effectiveFrom: new Date("2026-01-01"),
    },
    {
      channel: "Flipkart",
      partnerId: partnerMap.get("Flipkart").id,
      commissionPercent: new Decimal(10.0),
      fixedFee: new Decimal(12.0),
      otherFee: new Decimal(4.0),
      effectiveFrom: new Date("2026-01-01"),
    },
    {
      channel: "Shopify",
      partnerId: partnerMap.get("Shopify").id,
      commissionPercent: new Decimal(2.0),
      fixedFee: new Decimal(0.0),
      otherFee: new Decimal(0.0),
      effectiveFrom: new Date("2026-01-01"),
    },
    {
      channel: "D2C Website",
      partnerId: partnerMap.get("D2C Website").id,
      commissionPercent: new Decimal(1.5),
      fixedFee: new Decimal(0.0),
      otherFee: new Decimal(0.0),
      effectiveFrom: new Date("2026-01-01"),
    },
  ];
  for (const crc of channelRateCards) {
    await prisma.channelRateCard.create({ data: crc });
  }
  console.log("✓ Channel rate cards active.");

  // 5. Seed Courier Rate Cards
  console.log("5. Seeding Courier Rate Cards...");
  await prisma.rateCard.deleteMany({});
  const courierCards = [
    {
      channel: "Amazon",
      courierName: "Delhivery",
      minWeightKg: new Decimal(0),
      maxWeightKg: new Decimal(5),
      baseCharge: new Decimal(50.0),
      perKgCharge: new Decimal(15.0),
      effectiveFrom: new Date("2026-01-01"),
      partnerId: partnerMap.get("Amazon").id,
    },
    {
      channel: "Amazon",
      courierName: "Blue Dart",
      minWeightKg: new Decimal(0),
      maxWeightKg: new Decimal(5),
      baseCharge: new Decimal(60.0),
      perKgCharge: new Decimal(20.0),
      effectiveFrom: new Date("2026-01-01"),
      partnerId: partnerMap.get("Amazon").id,
    },
    {
      channel: "Flipkart",
      courierName: "Delhivery",
      minWeightKg: new Decimal(0),
      maxWeightKg: new Decimal(5),
      baseCharge: new Decimal(48.0),
      perKgCharge: new Decimal(14.0),
      effectiveFrom: new Date("2026-01-01"),
      partnerId: partnerMap.get("Flipkart").id,
    },
    {
      channel: "Flipkart",
      courierName: "Blue Dart",
      minWeightKg: new Decimal(0),
      maxWeightKg: new Decimal(5),
      baseCharge: new Decimal(58.0),
      perKgCharge: new Decimal(18.0),
      effectiveFrom: new Date("2026-01-01"),
      partnerId: partnerMap.get("Flipkart").id,
    },
    {
      channel: "Shopify",
      courierName: "Blue Dart",
      minWeightKg: new Decimal(0),
      maxWeightKg: new Decimal(5),
      baseCharge: new Decimal(55.0),
      perKgCharge: new Decimal(18.0),
      effectiveFrom: new Date("2026-01-01"),
      partnerId: partnerMap.get("Shopify").id,
    },
    {
      channel: "D2C Website",
      courierName: "Delhivery",
      minWeightKg: new Decimal(0),
      maxWeightKg: new Decimal(5),
      baseCharge: new Decimal(45.0),
      perKgCharge: new Decimal(15.0),
      effectiveFrom: new Date("2026-01-01"),
      partnerId: partnerMap.get("D2C Website").id,
    },
  ];
  for (const card of courierCards) {
    await prisma.rateCard.create({ data: card });
  }
  console.log("✓ Courier rate cards active.");

  // 6. Create Import Batches to give realistic import history
  console.log("6. Creating Import Batches for Audit History...");
  const orderBatch = await prisma.importBatch.create({
    data: {
      fileName: "oct_nov_orders_master.csv",
      importType: "ORDERS",
      status: "COMPLETED",
      rowCount: 1250,
      uploadedById: execUser.id,
      uploadedAt: daysFromNow(-1),
    },
  });

  const settlementBatch = await prisma.importBatch.create({
    data: {
      fileName: "marketplace_settlements_combined.csv",
      importType: "SETTLEMENTS",
      status: "COMPLETED",
      rowCount: 1160,
      uploadedById: execUser.id,
      uploadedAt: daysFromNow(-1),
    },
  });

  const freightBatch = await prisma.importBatch.create({
    data: {
      fileName: "courier_invoices_bluedart_delhivery.csv",
      importType: "FREIGHT",
      status: "COMPLETED",
      rowCount: 920,
      uploadedById: execUser.id,
      uploadedAt: daysFromNow(-1),
    },
  });

  const returnsBatch = await prisma.importBatch.create({
    data: {
      fileName: "warehouse_inward_returns.csv",
      importType: "RETURNS",
      status: "COMPLETED",
      rowCount: 55,
      uploadedById: execUser.id,
      uploadedAt: daysFromNow(-1),
    },
  });

  // 7. Generate 1,250 Realistic D2C Orders
  console.log("7. Generating 1,250 Realistic Multi-Channel Orders...");
  const channels = [
    { name: "Amazon", weight: 0.45, partner: partnerMap.get("Amazon") },
    { name: "Flipkart", weight: 0.25, partner: partnerMap.get("Flipkart") },
    { name: "Shopify", weight: 0.15, partner: partnerMap.get("Shopify") },
    { name: "D2C Website", weight: 0.15, partner: partnerMap.get("D2C Website") },
  ];

  const standardOrderPrices = [899, 1249, 1499, 1799, 2199, 2699, 3499, 4299, 4999];
  const couriers = ["Blue Dart", "Delhivery"];

  const ordersToInsert = [];
  const settlementsToInsert = [];
  const freightToInsert = [];
  const returnsToInsert = [];

  for (let i = 1; i <= 1250; i++) {
    const orderNumber = `RX-ORD-${10000 + i}`;
    
    // Pick channel
    const rand = Math.random();
    let selectedChannel = channels[0];
    let cumulative = 0;
    for (const c of channels) {
      cumulative += c.weight;
      if (rand <= cumulative) {
        selectedChannel = c;
        break;
      }
    }

    // Realistic date in past 30 days
    // Older orders (indices 1–1100): 6 to 30 days ago
    // Newer orders (indices 1101–1250): 1 to 5 days ago (awaiting settlement within SLA)
    const isRecent = i > 1160;
    const daysAgo = isRecent ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 25) + 6;
    const orderDate = daysFromNow(-daysAgo);

    // Settlement due date (typically orderDate + 7 days for marketplace, +3 for D2C)
    const dueDays = selectedChannel.name === "Amazon" ? 7 : selectedChannel.name === "Flipkart" ? 7 : 3;
    const settlementDueAt = new Date(orderDate.getTime() + dueDays * 24 * 60 * 60 * 1000);

    // Order Value & Weight
    const priceIndex = Math.floor(Math.random() * standardOrderPrices.length);
    const orderValueNum = standardOrderPrices[priceIndex];
    const orderValue = new Decimal(orderValueNum);

    // Calculate Expected Settlement based on Channel Rate Card
    let expectedSettlement = orderValue;
    if (selectedChannel.name === "Amazon") {
      expectedSettlement = orderValue.mul(0.88).minus(20); // 12% comm + 15 fix + 5 other
    } else if (selectedChannel.name === "Flipkart") {
      expectedSettlement = orderValue.mul(0.90).minus(16); // 10% comm + 12 fix + 4 other
    } else if (selectedChannel.name === "Shopify") {
      expectedSettlement = orderValue.mul(0.98); // 2% gateway
    } else {
      expectedSettlement = orderValue.mul(0.985); // 1.5% gateway
    }
    expectedSettlement = expectedSettlement.toDecimalPlaces(2);

    const weightKg = new Decimal((0.6 + Math.random() * 2.2).toFixed(2));
    const isReturned = i % 22 === 0; // ~55 returns
    const deliveryStatus = isReturned ? "RETURNED" : "DELIVERED";
    const paymentMode = i % 4 === 0 ? "COD" : "PREPAID";

    const orderId = `ord-${i}-${Date.now().toString(36)}`;

    ordersToInsert.push({
      id: orderId,
      orderNumber,
      channel: selectedChannel.name,
      partnerId: selectedChannel.partner.id,
      orderDate,
      paymentMode,
      deliveryStatus,
      orderValue,
      expectedSettlementAmount: expectedSettlement,
      settlementDueAt,
      weightKg,
    });

    // Determine Settlement Scenario:
    if (!isRecent) {
      if (i % 12 === 0) {
        // SCENARIO B: SHORT_PAID (Marketplace deduction leakage) ~95 orders
        const shortDiff = new Decimal((60 + Math.random() * 280).toFixed(2));
        const amountReceived = Decimal.max(0, expectedSettlement.minus(shortDiff)).toDecimalPlaces(2);
        settlementsToInsert.push({
          id: `stl-${i}`,
          orderId,
          partnerId: selectedChannel.partner.id,
          grossAmount: orderValue,
          amountReceived,
          commissionAmount: expectedSettlement.minus(amountReceived).plus(orderValue.minus(expectedSettlement)),
          tcsAmount: new Decimal((orderValueNum * 0.0075).toFixed(2)),
          tdsAmount: new Decimal((orderValueNum * 0.0025).toFixed(2)),
          settlementDate: new Date(settlementDueAt.getTime() + 1 * 24 * 60 * 60 * 1000),
          referenceNumber: `TXN-${orderNumber}-SHORT`,
          importBatchId: settlementBatch.id,
        });
      } else if (i % 34 === 0) {
        // SCENARIO C: UNPAID_PAST_DUE (Confirmed overdue non-payment) ~35 orders
        settlementsToInsert.push({
          id: `stl-${i}`,
          orderId,
          partnerId: selectedChannel.partner.id,
          grossAmount: new Decimal(0),
          amountReceived: new Decimal(0),
          commissionAmount: new Decimal(0),
          tcsAmount: new Decimal(0),
          tdsAmount: new Decimal(0),
          settlementDate: settlementDueAt,
          referenceNumber: `TXN-${orderNumber}-ZERO`,
          importBatchId: settlementBatch.id,
        });
      } else {
        // SCENARIO A: SETTLED (Clean exact remittance) ~1,030 orders
        settlementsToInsert.push({
          id: `stl-${i}`,
          orderId,
          partnerId: selectedChannel.partner.id,
          grossAmount: orderValue,
          amountReceived: expectedSettlement,
          commissionAmount: orderValue.minus(expectedSettlement),
          tcsAmount: new Decimal((orderValueNum * 0.0075).toFixed(2)),
          tdsAmount: new Decimal((orderValueNum * 0.0025).toFixed(2)),
          settlementDate: settlementDueAt,
          referenceNumber: `TXN-${orderNumber}-SETTLED`,
          importBatchId: settlementBatch.id,
        });
      }
    }
    // If isRecent (indices 1161-1250): NO settlement file uploaded yet!
    // -> Accurately classified as REVIEW_REQUIRED (Awaiting remittance within SLA) with zero false claims!

    // Determine Courier Freight Scenario:
    if (i <= 920) {
      const courierName = couriers[i % 2];
      const isFreightOvercharge = i % 20 === 0; // ~46 overcharges
      
      // Calculate contracted rate
      const baseRate = courierName === "Blue Dart" ? 60 : 50;
      const perKg = courierName === "Blue Dart" ? 20 : 15;
      const expectedFreight = new Decimal(baseRate).plus(weightKg.mul(perKg));

      // If overcharged, billed weight is higher
      const chargedAmount = isFreightOvercharge
        ? expectedFreight.plus(new Decimal((35 + Math.random() * 85).toFixed(2)))
        : expectedFreight;

      freightToInsert.push({
        id: `frt-${i}`,
        orderId,
        courierName,
        chargedAmount: chargedAmount.toDecimalPlaces(2),
        actualWeight: isFreightOvercharge ? weightKg.plus(new Decimal(1.5)) : weightKg,
        invoiceNumber: `INV-${courierName.substring(0, 2).toUpperCase()}-${20000 + i}`,
        chargedAt: new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      });
    }

    // Determine Return Scenario:
    if (isReturned) {
      const isLostInTransit = i % 88 === 0; // ~14 lost returns
      const returnDate = new Date(orderDate.getTime() + 4 * 24 * 60 * 60 * 1000);
      returnsToInsert.push({
        id: `ret-${i}`,
        orderId,
        returnDate,
        status: isLostInTransit ? "IN_TRANSIT" : "WAREHOUSE_RECEIVED",
        warehouseReceivedAt: isLostInTransit
          ? null
          : new Date(returnDate.getTime() + 3 * 24 * 60 * 60 * 1000),
      });
    }
  }

  // Bulk Insert in chunks of 500
  console.log(`Inserting ${ordersToInsert.length} orders...`);
  for (let i = 0; i < ordersToInsert.length; i += 500) {
    await prisma.order.createMany({ data: ordersToInsert.slice(i, i + 500) });
  }

  console.log(`Inserting ${settlementsToInsert.length} settlements...`);
  for (let i = 0; i < settlementsToInsert.length; i += 500) {
    await prisma.settlement.createMany({ data: settlementsToInsert.slice(i, i + 500) });
  }

  console.log(`Inserting ${freightToInsert.length} freight charges...`);
  for (let i = 0; i < freightToInsert.length; i += 500) {
    await prisma.freightCharge.createMany({ data: freightToInsert.slice(i, i + 500) });
  }

  console.log(`Inserting ${returnsToInsert.length} returns...`);
  for (let i = 0; i < returnsToInsert.length; i += 500) {
    await prisma.returnRecord.createMany({ data: returnsToInsert.slice(i, i + 500) });
  }

  // 8. Seed AI Column Mappings
  console.log("8. Seeding AI Column Mappings...");
  const mappingTemplates = [
    {
      sourceName: "shopify_orders_master.csv",
      version: 1,
      mapping: {
        importType: "ORDERS",
        suggestions: [
          { originalHeader: "Order ID", suggestedField: "orderNumber", confidence: 0.99, reason: "Exact match for unique order identifier" },
          { originalHeader: "Created At", suggestedField: "orderDate", confidence: 0.98, reason: "Matched timestamp to orderDate" },
          { originalHeader: "Total Net Price", suggestedField: "orderValue", confidence: 0.99, reason: "Direct currency match to orderValue" },
          { originalHeader: "Weight (g)", suggestedField: "weightKg", confidence: 0.95, reason: "Normalized grams to weightKg" },
        ],
      },
      approved: true,
      approvedAt: daysFromNow(-3),
      approvedById: execUser.id,
      importBatchId: orderBatch.id,
    },
    {
      sourceName: "amazon_settlement_v2.csv",
      version: 1,
      mapping: {
        importType: "SETTLEMENTS",
        suggestions: [
          { originalHeader: "amazon-order-id", suggestedField: "orderNumber", confidence: 0.99, reason: "Amazon standard order ID" },
          { originalHeader: "settlement-id", suggestedField: "settlementReference", confidence: 0.99, reason: "Settlement transaction ID" },
          { originalHeader: "total-amount", suggestedField: "amount", confidence: 0.98, reason: "Net settlement credited amount" },
          { originalHeader: "posted-date", suggestedField: "transactionDate", confidence: 0.97, reason: "Remittance posting date" },
        ],
      },
      approved: true,
      approvedAt: daysFromNow(-2),
      approvedById: execUser.id,
      importBatchId: settlementBatch.id,
    },
    {
      sourceName: "courier_freight_invoices.csv",
      version: 1,
      mapping: {
        importType: "FREIGHT",
        suggestions: [
          { originalHeader: "Reference No", suggestedField: "orderNumber", confidence: 0.96, reason: "Courier order reference" },
          { originalHeader: "Freight Total", suggestedField: "freightCharge", confidence: 0.99, reason: "Courier invoiced charge" },
          { originalHeader: "Billed Wt (KG)", suggestedField: "actualWeight", confidence: 0.98, reason: "Courier charged weight" },
          { originalHeader: "AWB Number", suggestedField: "invoiceNumber", confidence: 0.95, reason: "Air Waybill tracking invoice" },
        ],
      },
      approved: true,
      approvedAt: daysFromNow(-2),
      approvedById: execUser.id,
      importBatchId: freightBatch.id,
    },
    {
      sourceName: "warehouse_returns_manifest.csv",
      version: 1,
      mapping: {
        importType: "RETURNS",
        suggestions: [
          { originalHeader: "Customer Order #", suggestedField: "orderNumber", confidence: 0.98, reason: "Return order lookup" },
          { originalHeader: "Return Initiated", suggestedField: "returnDate", confidence: 0.96, reason: "RTO pickup timestamp" },
          { originalHeader: "Inward Scan Date", suggestedField: "warehouseReceivedAt", confidence: 0.94, reason: "Warehouse gate inward scan" },
          { originalHeader: "Disposition", suggestedField: "status", confidence: 0.92, reason: "Quality inspection disposition" },
        ],
      },
      approved: false, // PENDING REVIEW for the reviewer to try approving!
      importBatchId: returnsBatch.id,
    },
  ];

  for (const m of mappingTemplates) {
    await prisma.columnMapping.create({ data: m });
  }
  console.log("✓ Column mappings ready (3 Approved, 1 Pending Review).");

  // 9. Execute 3-Way Reconciliation Run
  console.log("9. Running Automated 3-Way Reconciliation Pipeline...");
  const reconciliationResult = await runReconciliation();
  console.log(`✓ Reconciliation completed (Run ID: ${reconciliationResult.runId})`);

  // 10. Generate Dispute Claims with Complete Evidence
  console.log("10. Generating Financial Dispute Claims...");
  const claimResult = await generateClaims(reconciliationResult.runId);
  console.log(`✓ Generated ${claimResult.totalCreated} dispute claims.`);

  // 11. Diversify Claim Statuses (OPEN, IN_REVIEW, RESOLVED)
  console.log("11. Updating Claim Workflows (Open, In-Review, Resolved)...");
  const allClaims = await prisma.claim.findMany({ take: 30 });
  for (let i = 0; i < allClaims.length; i++) {
    if (i % 5 === 0) {
      await prisma.claim.update({
        where: { id: allClaims[i].id },
        data: {
          status: "RESOLVED",
          ownerId: execUser.id,
        },
      });
    } else if (i % 3 === 0) {
      await prisma.claim.update({
        where: { id: allClaims[i].id },
        data: {
          status: "IN_REVIEW",
          ownerId: execUser.id,
        },
      });
    }
  }

  // 12. Seed Audit Trail
  console.log("12. Seeding Immutable Audit Logs...");
  const auditEntries = [
    {
      action: "COLUMN_MAPPING_APPROVED",
      entity: "ColumnMapping",
      entityId: "shopify_orders_master.csv",
      details: { confidence: 0.98, headersMapped: 4, approver: "Demo Finance Executive" },
      userId: execUser.id,
      createdAt: daysFromNow(-3),
    },
    {
      action: "RECONCILIATION_RUN_COMPLETED",
      entity: "ReconciliationRun",
      entityId: reconciliationResult.runId,
      details: { totalOrders: 1250, runDurationMs: 142 },
      userId: execUser.id,
      createdAt: daysFromNow(-1),
    },
    {
      action: "RATE_CARD_CONFIGURED",
      entity: "RateCard",
      entityId: "Blue Dart",
      details: { courier: "Blue Dart", baseCharge: 60, perKgCharge: 20 },
      userId: execUser.id,
      createdAt: daysFromNow(-5),
    },
  ];
  for (const entry of auditEntries) {
    await prisma.auditLog.create({ data: entry });
  }

  console.log("\n=======================================================");
  console.log("DATABASE SEEDING SUCCESSFUL!");
  console.log("=======================================================");
  console.log("- Total Orders: 1,250 (Realistic D2C Master)");
  console.log("- Multi-Channel: Amazon, Flipkart, Shopify, D2C Website");
  console.log("- Status Distribution: Balanced (~82% Settled, ~8% Short-Paid, ~4% Freight Overcharged, ~7% In-SLA)");
  console.log("- Active Claims: Verified with Evidence Payloads");
  console.log("- Demo Reviewer: demo@reconcilex.com / Password123!");
  console.log("=======================================================\n");
}

seedDatabase()
  .catch((err) => {
    console.error("Seeding error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

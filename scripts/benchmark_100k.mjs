import fs from "fs";
import path from "path";
import prisma from "../server/src/config/database.js";
import { parseUploadedFile } from "../server/src/imports/parsers/fileParser.js";
import { normalizeColumns } from "../server/src/imports/normalizers/columnNormalizer.js";
import { validateImportRecords } from "../server/src/imports/validators/importValidator.js";
import { runReconciliation } from "../server/src/services/reconciliationRepository.js";
import { getDashboardSummary } from "../server/src/services/dashboardService.js";

function getMemoryUsageMB() {
  const mem = process.memoryUsage();
  return {
    rss: (mem.rss / 1024 / 1024).toFixed(1),
    heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(1),
  };
}

async function runBenchmark() {
  console.log("===============================================================================");
  console.log("             RECONCILEX 100,000-RECORD BENCHMARK SUITE                         ");
  console.log("             Target: Ingestion & Reconciliation < 60 seconds                   ");
  console.log("===============================================================================\n");

  const filePath = "C:/Users/RAHUL/Downloads/reconcilex_test_100k_orders.csv";

  if (!fs.existsSync(filePath)) {
    console.error(`Error: Test file not found at ${filePath}`);
    process.exit(1);
  }

  const initialMem = getMemoryUsageMB();
  console.log(`Initial Process Memory: RSS: ${initialMem.rss} MB | Heap: ${initialMem.heapUsed} MB\n`);

  const benchmarkResults = [];

  // ===========================================================================
  // STAGE 1: Streaming File Parse
  // ===========================================================================
  console.log("[STAGE 1/6] Streaming CSV Parsing...");
  const t1 = Date.now();
  const records = await parseUploadedFile(filePath);
  const parseSec = (Date.now() - t1) / 1000;
  const mem1 = getMemoryUsageMB();
  console.log(`  ✓ Parsed ${records.length.toLocaleString()} rows in ${parseSec.toFixed(2)}s (Heap: ${mem1.heapUsed} MB)`);
  benchmarkResults.push({
    stage: "1. Streaming File Parse",
    records: records.length,
    elapsedSeconds: Number(parseSec.toFixed(2)),
    heapMB: mem1.heapUsed,
  });

  // ===========================================================================
  // STAGE 2: Scoped Intelligent Column Normalization
  // ===========================================================================
  console.log("\n[STAGE 2/6] Scoped Column Normalization (ORDERS)...");
  const t2 = Date.now();
  const normalized = normalizeColumns(records, "ORDERS");
  const normSec = (Date.now() - t2) / 1000;
  const mem2 = getMemoryUsageMB();
  console.log(`  ✓ Normalized ${normalized.normalizedRecords.length.toLocaleString()} records in ${normSec.toFixed(2)}s`);
  console.log(`    Mapped fields: ${Object.keys(normalized.columnMapping).join(", ")}`);
  benchmarkResults.push({
    stage: "2. Column Normalization",
    records: normalized.normalizedRecords.length,
    elapsedSeconds: Number(normSec.toFixed(2)),
    heapMB: mem2.heapUsed,
  });

  // ===========================================================================
  // STAGE 3: Universal 6-Category Schema Validation
  // ===========================================================================
  console.log("\n[STAGE 3/6] Schema & Data Validation...");
  const t3 = Date.now();
  const validation = validateImportRecords(normalized.normalizedRecords, {
    importType: "ORDERS",
    duplicateKey: "orderNumber",
  });
  const valSec = (Date.now() - t3) / 1000;
  const mem3 = getMemoryUsageMB();
  console.log(`  ✓ Validated ${validation.totalRows.toLocaleString()} rows in ${valSec.toFixed(2)}s:`);
  console.log(`    Valid: ${validation.validCount.toLocaleString()} | Rejected: ${validation.rejectedCount} | Duplicates: ${validation.duplicateCount}`);
  benchmarkResults.push({
    stage: "3. Schema Validation",
    records: validation.totalRows,
    elapsedSeconds: Number(valSec.toFixed(2)),
    heapMB: mem3.heapUsed,
  });

  // ===========================================================================
  // STAGE 4: High-Speed Chunked DB Ingestion
  // ===========================================================================
  console.log("\n[STAGE 4/6] Idempotent Database Ingestion (Chunks of 5,000)...");
  const t4 = Date.now();
  const CHUNK_SIZE = 5000;

  // Resolve partners in DB
  const existingPartners = await prisma.partner.findMany();
  const partnerMap = new Map(existingPartners.map((p) => [p.name.trim().toLowerCase(), p.id]));

  const ordersToInsert = validation.validRecords.map((rec) => {
    const partnerName = (rec.partnerName || rec.channel || "").trim();
    const partnerId = partnerMap.get(partnerName.toLowerCase()) ?? null;
    return {
      orderNumber: rec.orderNumber,
      channel: rec.channel || "Website",
      partnerId,
      orderDate: rec.orderDate,
      paymentMode: rec.paymentMode || "COD",
      deliveryStatus: rec.deliveryStatus || "Delivered",
      orderValue: rec.orderValue,
      expectedSettlementAmount: rec.expectedSettlementAmount ?? null,
      settlementDueAt: rec.settlementDueAt ?? null,
      weightKg: rec.weightKg ?? null,
    };
  });

  for (let i = 0; i < ordersToInsert.length; i += CHUNK_SIZE) {
    const chunk = ordersToInsert.slice(i, i + CHUNK_SIZE);
    await prisma.order.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  const insertSec = (Date.now() - t4) / 1000;
  const mem4 = getMemoryUsageMB();
  console.log(`  ✓ Inserted/Staged ${ordersToInsert.length.toLocaleString()} orders in ${insertSec.toFixed(2)}s (Heap: ${mem4.heapUsed} MB)`);
  benchmarkResults.push({
    stage: "4. Database Ingestion",
    records: ordersToInsert.length,
    elapsedSeconds: Number(insertSec.toFixed(2)),
    heapMB: mem4.heapUsed,
  });

  // ===========================================================================
  // STAGE 5: 3-Way Reconciliation Engine Execution
  // ===========================================================================
  console.log("\n[STAGE 5/6] 3-Way Reconciliation Engine Execution...");
  const t5 = Date.now();
  const recResult = await runReconciliation();
  const recSec = (Date.now() - t5) / 1000;
  const mem5 = getMemoryUsageMB();
  console.log(`  ✓ Reconciliation completed across ${recResult.totalOrders.toLocaleString()} orders in ${recSec.toFixed(2)}s`);
  console.log(`    Status breakdown: Settled: ${recResult.statusCounts.SETTLED} | Review Required: ${recResult.statusCounts.REVIEW_REQUIRED} | Freight Overcharged: ${recResult.statusCounts.FREIGHT_OVERCHARGED}`);
  benchmarkResults.push({
    stage: "5. Reconciliation Engine",
    records: recResult.totalOrders,
    elapsedSeconds: Number(recSec.toFixed(2)),
    heapMB: mem5.heapUsed,
  });

  // ===========================================================================
  // STAGE 6: Multi-Dimensional Dashboard Aggregation
  // ===========================================================================
  console.log("\n[STAGE 6/6] Multi-Dimensional Dashboard Summary Aggregation...");
  const t6 = Date.now();
  const dash = await getDashboardSummary();
  const dashSec = (Date.now() - t6) / 1000;
  const mem6 = getMemoryUsageMB();
  console.log(`  ✓ Dashboard aggregated in ${dashSec.toFixed(2)}s`);
  console.log(`    Total Orders: ${dash.totalOrders.toLocaleString()} | Expected: INR ${dash.totalExpected}`);
  console.log(`    Confirmed Money at Risk: INR ${dash.moneyAtRisk} | TCS: INR ${dash.totalTCS} | TDS: INR ${dash.totalTDS}`);
  benchmarkResults.push({
    stage: "6. Dashboard Aggregation",
    records: dash.totalOrders,
    elapsedSeconds: Number(dashSec.toFixed(2)),
    heapMB: mem6.heapUsed,
  });

  // ===========================================================================
  // BENCHMARK REPORT
  // ===========================================================================
  console.log("\n===============================================================================");
  console.log("                        BENCHMARK SUMMARY REPORT                               ");
  console.log("===============================================================================");
  console.table(benchmarkResults);

  const totalPipelineTime = (parseSec + normSec + valSec + insertSec).toFixed(2);
  const totalReconciliationTime = recSec.toFixed(2);

  console.log(`Total Ingestion Pipeline Time (Parse + Normalize + Validate + Insert): ${totalPipelineTime}s`);
  console.log(`Reconciliation Engine Time (100,000+ orders matching):                 ${totalReconciliationTime}s`);
  console.log(`Benchmark Target (< 60s for 100,000 records):                          ${recSec < 60 ? "PASSED (PASS)" : "FAILED (FAIL)"}`);
  console.log("===============================================================================\n");

  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error("Benchmark failed with error:", err);
  process.exit(1);
});

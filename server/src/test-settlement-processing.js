
import prisma from "./config/database.js";
import { processSettlementImport } from "./services/settlementProcessingService.js";

const importBatchId = "80e9eda3-9417-41c4-85b3-c7cea958a071";

try {
  const existingSettlements = await prisma.settlement.findMany({
    where: {
      OR: [
        { importBatchId },
        { referenceNumber: { in: ["TXN-001", "TXN-002", "TXN-003"] } },
      ],
    },
    select: { id: true },
  });

  const settlementIds = existingSettlements.map((s) => s.id);

  if (settlementIds.length > 0) {
    await prisma.matchSettlement.deleteMany({
      where: { settlementId: { in: settlementIds } },
    });

    await prisma.settlement.deleteMany({
      where: { id: { in: settlementIds } },
    });
  }

  const rowsToReset = [
    { rowNumber: 2, orderNumber: "RX-1001", settlementReference: "TXN-001", amount: "700", transactionDate: "2026-11-01", status: "Partial" },
    { rowNumber: 3, orderNumber: "RX-1001", settlementReference: "TXN-002", amount: "709", transactionDate: "2026-11-02", status: "Settled" },
    { rowNumber: 4, orderNumber: "RX-1002", settlementReference: "TXN-003", amount: "1372", transactionDate: "2026-11-03", status: "Settled" },
  ];

  for (const item of rowsToReset) {
    await prisma.sourceRecord.updateMany({
      where: { importBatchId, rowNumber: item.rowNumber },
      data: {
        processed: false,
        normalizedData: {
          orderNumber: item.orderNumber,
          settlementReference: item.settlementReference,
          amount: item.amount,
          transactionDate: item.transactionDate,
          status: item.status,
          validationStatus: "VALID",
        },
      },
    });
  }

  const result = await processSettlementImport(importBatchId);

  console.log("\nSETTLEMENT PROCESSING RESULT:");
  console.log(JSON.stringify(result, null, 2));

  if (
    result.processedCount !== 3 ||
    result.rejectedCount !== 0 ||
    result.skippedCount !== 3
  ) {
    throw new Error("Settlement processing test failed.");
  }

  console.log("\nSettlement processing test passed!");
} catch (error) {
  console.error("Settlement processing failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

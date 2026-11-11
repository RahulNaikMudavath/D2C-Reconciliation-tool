import prisma from "../config/database.js";

/**
 * High-speed batch processing for settlement import records.
 * Optimized with pre-fetched order lookups and bulk inserts in chunks of 5,000,
 * eliminating the slow N-interactive-transactions bottleneck.
 *
 * @param {string} importBatchId - UUID of the settlement import batch.
 * @returns {Promise<object>} Processing summary.
 */
export async function processSettlementImport(importBatchId) {
  // 1. Verify that the import batch exists.
  const batch = await prisma.importBatch.findUnique({
    where: { id: importBatchId },
  });

  if (!batch) {
    throw new Error("Import batch not found.");
  }

  if (batch.importType !== "SETTLEMENTS" && batch.importType !== "COD") {
    throw new Error("This import batch is not a settlement or COD file.");
  }

  // 2. Check if settlements were already created during initial ingestion
  const existingSettlementsCount = await prisma.settlement.count({
    where: { importBatchId },
  });

  if (existingSettlementsCount > 0) {
    await prisma.sourceRecord.updateMany({
      where: { importBatchId, processed: false },
      data: { processed: true },
    });

    return {
      totalRecords: existingSettlementsCount,
      processedCount: existingSettlementsCount,
      rejectedCount: 0,
      skippedCount: 0,
      alreadyProcessed: true,
      message: `${existingSettlementsCount} settlements already created and staged in database.`,
    };
  }

  // 3. Fetch all unprocessed source records.
  const sourceRecords = await prisma.sourceRecord.findMany({
    where: {
      importBatchId,
      processed: false,
    },
    orderBy: {
      rowNumber: "asc",
    },
  });

  const summary = {
    totalRecords: sourceRecords.length,
    processedCount: 0,
    rejectedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  if (sourceRecords.length === 0) {
    return summary;
  }

  // Filter valid source records
  const validSources = [];
  for (const source of sourceRecords) {
    const normalized = source.normalizedData;
    if (normalized?.validationStatus !== "VALID") {
      summary.skippedCount++;
    } else {
      validSources.push(source);
    }
  }

  if (validSources.length === 0) {
    return summary;
  }

  // 3. Batch lookup matching orders
  const CHUNK_SIZE = 5000;
  const allOrderNumbers = [...new Set(validSources.map((s) => String(s.normalizedData.orderNumber ?? "").trim()))];
  const orderMap = new Map();

  for (let i = 0; i < allOrderNumbers.length; i += CHUNK_SIZE) {
    const chunk = allOrderNumbers.slice(i, i + CHUNK_SIZE);
    const orders = await prisma.order.findMany({
      where: { orderNumber: { in: chunk } },
      select: {
        id: true,
        orderNumber: true,
        partnerId: true,
      },
    });
    for (const o of orders) {
      orderMap.set(o.orderNumber, o);
    }
  }

  const settlementsToInsert = [];
  const processedSourceIds = [];
  const rejectedSources = [];

  for (const source of validSources) {
    const normalized = source.normalizedData;
    const orderNumber = String(normalized.orderNumber ?? "").trim();
    const referenceNumber = String(normalized.settlementReference ?? normalized.referenceNumber ?? "").trim();
    const amount = normalized.amount ?? normalized.remittedAmount;
    const transactionDate = normalized.settlementDate ?? normalized.transactionDate ?? normalized.remittanceDate;

    const order = orderMap.get(orderNumber);

    if (!order) {
      const err = `Order "${orderNumber}" was not found in the database.`;
      rejectedSources.push({ id: source.id, rowNumber: source.rowNumber, normalized, error: err });
      summary.rejectedCount++;
      summary.errors.push({ rowNumber: source.rowNumber, errors: [err] });
      continue;
    }

    const tcsAmount = Number(normalized.tcsAmount ?? 0);
    const tdsAmount = Number(normalized.tdsAmount ?? 0);

    settlementsToInsert.push({
      orderId: order.id,
      partnerId: order.partnerId || null,
      importBatchId: batch.id,
      referenceNumber: referenceNumber || null,
      amountReceived: amount,
      grossAmount: normalized.grossAmount ?? null,
      commissionAmount: normalized.commissionAmount ?? 0,
      otherFeeAmount: normalized.otherFeeAmount ?? 0,
      tcsAmount: Number.isFinite(tcsAmount) && tcsAmount >= 0 ? tcsAmount : 0,
      tdsAmount: Number.isFinite(tdsAmount) && tdsAmount >= 0 ? tdsAmount : 0,
      settlementDate: transactionDate ? new Date(transactionDate) : new Date(),
    });

    processedSourceIds.push(source.id);
  }

  // 4. Bulk insert settlements in chunks of 5,000
  for (let i = 0; i < settlementsToInsert.length; i += CHUNK_SIZE) {
    const chunk = settlementsToInsert.slice(i, i + CHUNK_SIZE);
    await prisma.settlement.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  // 5. Mark processed source records in bulk chunks
  for (let i = 0; i < processedSourceIds.length; i += CHUNK_SIZE) {
    const chunk = processedSourceIds.slice(i, i + CHUNK_SIZE);
    await prisma.sourceRecord.updateMany({
      where: { id: { in: chunk } },
      data: { processed: true },
    });
  }

  // 6. Update rejected source records
  for (const rej of rejectedSources) {
    await prisma.sourceRecord.update({
      where: { id: rej.id },
      data: {
        normalizedData: {
          ...rej.normalized,
          validationStatus: "REJECTED",
          errors: [rej.error],
        },
      },
    });
  }

  summary.processedCount = processedSourceIds.length;
  return summary;
}

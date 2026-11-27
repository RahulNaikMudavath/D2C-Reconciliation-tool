import Decimal from "decimal.js";
import prisma from "../config/database.js";
import { parseDateSafe, parseDecimalSafe } from "../imports/validators/importValidator.js";

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
    const error = new Error("Import batch not found.");
    error.statusCode = 404;
    throw error;
  }

  if (batch.importType !== "SETTLEMENTS" && batch.importType !== "COD") {
    const error = new Error("This import batch is not a settlement or COD file.");
    error.statusCode = 400;
    throw error;
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

    // Run reconciliation in background to ensure matches stay up to date
    try {
      const { runReconciliation } = await import("./reconciliationRepository.js");
      await runReconciliation();
    } catch (reconErr) {
      console.warn("Reconciliation notice during reprocess check:", reconErr.message);
    }

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

  // 3. Batch lookup matching orders and partners
  const CHUNK_SIZE = 5000;
  const allOrderNumbers = [...new Set(validSources.map((s) => String(s.normalizedData?.orderNumber ?? "").trim()))];
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

  // Partner fallback map for records where order.partnerId might be missing
  const allPartners = await prisma.partner.findMany();
  const partnerNameMap = new Map(
    allPartners.map((p) => [p.name.trim().toLowerCase(), p.id])
  );

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

    const partnerId =
      order.partnerId ||
      (normalized.partnerName ? partnerNameMap.get(String(normalized.partnerName).trim().toLowerCase()) : null) ||
      null;

    const parsedDate = parseDateSafe(transactionDate);
    const settlementDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date();

    const parsedAmount = parseDecimalSafe(amount) || new Decimal(0);
    const parsedGross = parseDecimalSafe(normalized.grossAmount);
    const parsedCommission = parseDecimalSafe(normalized.commissionAmount) || new Decimal(0);
    const parsedOtherFee = parseDecimalSafe(normalized.otherFeeAmount) || new Decimal(0);
    const parsedTcs = parseDecimalSafe(normalized.tcsAmount) || new Decimal(0);
    const parsedTds = parseDecimalSafe(normalized.tdsAmount) || new Decimal(0);

    settlementsToInsert.push({
      orderId: order.id,
      partnerId,
      importBatchId: batch.id,
      referenceNumber: referenceNumber || null,
      amountReceived: parsedAmount.toFixed(2),
      grossAmount: parsedGross ? parsedGross.toFixed(2) : null,
      commissionAmount: parsedCommission.toFixed(2),
      otherFeeAmount: parsedOtherFee.toFixed(2),
      tcsAmount: parsedTcs.isNegative() ? "0.00" : parsedTcs.toFixed(2),
      tdsAmount: parsedTds.isNegative() ? "0.00" : parsedTds.toFixed(2),
      settlementDate,
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

  // 6. Update rejected source records in parallel batches to prevent timeouts
  const REJECT_BATCH_SIZE = 50;
  for (let i = 0; i < rejectedSources.length; i += REJECT_BATCH_SIZE) {
    const chunk = rejectedSources.slice(i, i + REJECT_BATCH_SIZE);
    await Promise.all(
      chunk.map((rej) =>
        prisma.sourceRecord.update({
          where: { id: rej.id },
          data: {
            normalizedData: {
              ...rej.normalized,
              validationStatus: "REJECTED",
              errors: [rej.error],
            },
          },
        })
      )
    );
  }

  // 7. Auto-run reconciliation if settlements were added, and update batch status
  if (settlementsToInsert.length > 0) {
    try {
      const { runReconciliation } = await import("./reconciliationRepository.js");
      await runReconciliation();
    } catch (reconErr) {
      console.warn("Reconciliation notice after settlement processing:", reconErr.message);
    }
  }

  await prisma.importBatch.update({
    where: { id: importBatchId },
    data: {
      status: "COMPLETED",
    },
  });

  summary.processedCount = processedSourceIds.length;
  return summary;
}

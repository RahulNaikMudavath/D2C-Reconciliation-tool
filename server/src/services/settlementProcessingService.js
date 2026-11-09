
import prisma from "../config/database.js";

export async function processSettlementImport(importBatchId) {
  // 1. Verify that the import batch exists.
  const batch = await prisma.importBatch.findUnique({
    where: { id: importBatchId },
  });

  if (!batch) {
    throw new Error("Import batch not found.");
  }

  if (batch.importType !== "SETTLEMENTS") {
    throw new Error("This import batch is not a settlement file.");
  }

  // 2. Fetch all source records that haven't been processed.
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

  // 3. Process each source record independently.
  for (const source of sourceRecords) {
    const normalized = source.normalizedData;

    if (normalized?.validationStatus !== "VALID") {
      summary.skippedCount++;
      continue;
    }

    const orderNumber = String(normalized.orderNumber ?? "").trim();
    const referenceNumber = String(
      normalized.settlementReference ?? ""
    ).trim();

    const amount = normalized.amount;
    const transactionDate = normalized.transactionDate;

    // 4. Check required settlement fields.
    const errors = [];

    if (!orderNumber) {
      errors.push("Missing order number.");
    }

    if (!referenceNumber) {
      errors.push("Missing settlement reference.");
    }

    if (!transactionDate || Number.isNaN(new Date(transactionDate).getTime())) {
      errors.push("Missing or invalid settlement date.");
    }

    if (errors.length > 0) {
      await prisma.sourceRecord.update({
        where: { id: source.id },
        data: {
          normalizedData: {
            ...normalized,
            validationStatus: "REJECTED",
            errors,
          },
        },
      });

      summary.rejectedCount++;
      summary.errors.push({
        rowNumber: source.rowNumber,
        errors,
      });

      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // 5. Find the matching order.
        const order = await tx.order.findUnique({
          where: { orderNumber },
          select: {
            id: true,
            partnerId: true,
          },
        });

        if (!order) {
          throw new Error(`Order ${orderNumber} was not found.`);
        }

        // 6. A partner is mandatory for duplicate protection.
        if (!order.partnerId) {
          throw new Error(
            `Order ${orderNumber} has no associated partner.`
          );
        }

        // 7. Create the actual settlement record.
        const tcsAmount = Number(normalized.tcsAmount ?? 0);
        const tdsAmount = Number(normalized.tdsAmount ?? 0);

        if (
          !Number.isFinite(tcsAmount) ||
          !Number.isFinite(tdsAmount) ||
          tcsAmount < 0 ||
          tdsAmount < 0
        ) {
          throw new Error("Invalid TCS or TDS amount.");
        }

        await tx.settlement.create({
          data: {
            orderId: order.id,
            partnerId: order.partnerId,
            importBatchId: batch.id,
            referenceNumber,
            amountReceived: amount,
            tcsAmount,
            tdsAmount,
            settlementDate: new Date(transactionDate),
          },
        });

        // 8. Mark the source record as processed.
        await tx.sourceRecord.update({
          where: { id: source.id },
          data: {
            processed: true,
          },
        });
      });

      summary.processedCount++;
    } catch (error) {
      // A duplicate database reference is rejected safely.
      const isDuplicate = error.code === "P2002";

      const message = isDuplicate
        ? "Duplicate settlement reference for this partner."
        : error.message;

      await prisma.sourceRecord.update({
        where: { id: source.id },
        data: {
          normalizedData: {
            ...normalized,
            validationStatus: "REJECTED",
            errors: [message],
          },
        },
      });

      summary.rejectedCount++;

      summary.errors.push({
        rowNumber: source.rowNumber,
        errors: [message],
      });
    }
  }

  return summary;
}

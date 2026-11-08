import prisma from "../config/database.js";

export async function processFreightImport(importBatchId) {
  // 1. Verify that the import batch exists.
  const batch = await prisma.importBatch.findUnique({
    where: { id: importBatchId },
  });

  if (!batch) {
    throw new Error("Import batch not found.");
  }

  if (batch.importType !== "FREIGHT") {
    throw new Error("This import batch is not a freight file.");
  }

  // 2. Fetch unprocessed source records.
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

  // 3. Process each freight record independently.
  for (const source of sourceRecords) {
    const normalized = source.normalizedData;

    if (normalized?.validationStatus !== "VALID") {
      summary.skippedCount++;
      continue;
    }

    const orderNumber = String(normalized.orderNumber ?? "").trim();
    const courierName = String(normalized.courierName ?? "").trim();
    const chargedAmount = normalized.chargedAmount;
    const actualWeight = normalized.actualWeight;
    const invoiceNumber = String(normalized.invoiceNumber ?? "").trim();

    const chargedAt = normalized.chargedAt
      ? new Date(normalized.chargedAt)
      : (batch.uploadedAt || batch.createdAt || new Date());

    // 4. Verify required freight fields.
    const errors = [];

    if (!orderNumber) {
      errors.push("Missing order number.");
    }

    if (!courierName) {
      errors.push("Missing courier name.");
    }

    if (
      chargedAmount === null ||
      chargedAmount === undefined ||
      !Number.isFinite(Number(chargedAmount)) ||
      Number(chargedAmount) < 0
    ) {
      errors.push("Invalid charged amount.");
    }

    if (
      actualWeight === null ||
      actualWeight === undefined ||
      !Number.isFinite(Number(actualWeight)) ||
      Number(actualWeight) <= 0
    ) {
      errors.push("Invalid actual weight.");
    }

    if (Number.isNaN(chargedAt.getTime())) {
      errors.push("Invalid freight charge date.");
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
          },
        });

        if (!order) {
          throw new Error(`Order ${orderNumber} was not found.`);
        }

        // 6. Prevent duplicate invoice imports for this order.
        if (invoiceNumber) {
          const existingCharge = await tx.freightCharge.findFirst({
            where: {
              orderId: order.id,
              invoiceNumber,
            },
            select: {
              id: true,
            },
          });

          if (existingCharge) {
            throw new Error(
              `Freight invoice ${invoiceNumber} already exists for order ${orderNumber}.`
            );
          }
        }

        // 7. Save the freight charge.
        await tx.freightCharge.create({
          data: {
            orderId: order.id,
            courierName,
            chargedAmount,
            actualWeight,
            invoiceNumber: invoiceNumber || null,
            chargedAt,
          },
        });

        // 8. Mark source record as processed.
        await tx.sourceRecord.update({
          where: { id: source.id },
          data: {
            processed: true,
          },
        });
      });

      summary.processedCount++;
    } catch (error) {
      const message =
        error.code === "P2002"
          ? "Duplicate freight charge."
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

import prisma from "../config/database.js";

export async function processReturnImport(importBatchId) {
  const batch = await prisma.importBatch.findUnique({
    where: { id: importBatchId },
  });

  if (!batch) {
    throw new Error("Import batch not found.");
  }

  if (!["RETURNS", "WAREHOUSE_RECEIPTS"].includes(batch.importType)) {
    throw new Error("Invalid return import batch type.");
  }

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

  for (const source of sourceRecords) {
    const normalized = source.normalizedData;

    if (normalized?.validationStatus !== "VALID") {
      summary.skippedCount++;
      continue;
    }

    const orderNumber = String(normalized.orderNumber ?? "").trim();

    const isReceipt = batch.importType === "WAREHOUSE_RECEIPTS";

    const eventDate = isReceipt
      ? new Date(normalized.warehouseReceivedAt)
      : new Date(normalized.returnDate);

    const returnStatus = String(
      normalized.returnStatus ?? "RETURN_INITIATED"
    ).trim().toUpperCase().replace(/[\s-]+/g, "_");

    const errors = [];

    if (!orderNumber) {
      errors.push("Missing order number.");
    }

    if (!normalized.returnDate && !isReceipt) {
      errors.push("Missing return date.");
    }

    if (isReceipt && !normalized.warehouseReceivedAt) {
      errors.push("Missing warehouse receipt date.");
    }

    if (
      (isReceipt || normalized.returnDate) &&
      Number.isNaN(eventDate.getTime())
    ) {
      errors.push("Invalid return or receipt date.");
    }

    if (!isReceipt && !returnStatus) {
      errors.push("Missing return status.");
    }

    if (errors.length > 0) {
      await rejectSource(source.id, normalized, errors);
      summary.rejectedCount++;
      summary.errors.push({ rowNumber: source.rowNumber, errors });
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { orderNumber },
          select: { id: true },
        });

        if (!order) {
          throw new Error(`Order ${orderNumber} was not found.`);
        }

        if (isReceipt) {
          const pendingReturns = await tx.returnRecord.findMany({
            where: {
              orderId: order.id,
              warehouseReceivedAt: null,
            },
            orderBy: {
              returnDate: "desc",
            },
          });

          if (pendingReturns.length === 0) {
            throw new Error(
              `No pending return found for order ${orderNumber}.`
            );
          }

          if (pendingReturns.length > 1) {
            throw new Error(
              `Multiple pending returns found for order ${orderNumber}. Manual matching is required.`
            );
          }

          await tx.returnRecord.update({
            where: { id: pendingReturns[0].id },
            data: {
              warehouseReceivedAt: eventDate,
            },
          });
        } else {
          const existingReturn = await tx.returnRecord.findFirst({
            where: {
              orderId: order.id,
              returnDate: eventDate,
            },
          });

          if (existingReturn) {
            throw new Error(
              `A return for order ${orderNumber} on this date already exists.`
            );
          }

          await tx.returnRecord.create({
            data: {
              orderId: order.id,
              returnDate: eventDate,
              status: returnStatus,
            },
          });
        }

        await tx.sourceRecord.update({
          where: { id: source.id },
          data: { processed: true },
        });
      });

      summary.processedCount++;
    } catch (error) {
      const message = error.message || "Return processing failed.";

      await rejectSource(source.id, normalized, [message]);

      summary.rejectedCount++;
      summary.errors.push({
        rowNumber: source.rowNumber,
        errors: [message],
      });
    }
  }

  return summary;
}

async function rejectSource(sourceId, normalized, errors) {
  await prisma.sourceRecord.update({
    where: { id: sourceId },
    data: {
      normalizedData: {
        ...normalized,
        validationStatus: "REJECTED",
        errors,
      },
    },
  });
}


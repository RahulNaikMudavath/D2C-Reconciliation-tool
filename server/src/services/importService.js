
import prisma from "../config/database.js";
import { parseUploadedFile } from "../imports/parsers/fileParser.js";
import {
  normalizeColumns,
  normalizeColumnsWithApprovedMapping,
} from "../imports/normalizers/columnNormalizer.js";
import { validateImportRecords } from "../imports/validators/importValidator.js";
import { suggestColumnMappings } from "./aiMappingService.js";
import { saveColumnMappingSuggestions } from "./columnMappingPersistenceService.js";

export async function processUploadedFile({
  file,
  importType,
  userId,
}) {
  if (!file) {
    throw new Error("No file uploaded.");
  }

  const importBatch = await prisma.importBatch.create({
    data: {
      fileName: file.originalname,
      importType,
      status: "PROCESSING",
      uploadedById: userId,
    },
  });

  try {
    // 1. Parse the uploaded file.
    const records = await parseUploadedFile(file.path);

    if (records.length === 0) {
      throw new Error("Uploaded file contains no records.");
    }

    // 2. Find the latest approved mapping for this source.
    const approvedMappings = await prisma.columnMapping.findMany({
      where: {
        sourceName: file.originalname,
        approved: true,
      },
      orderBy: {
        version: "desc",
      },
    });

    const approvedMapping = approvedMappings.find(
      (item) => item.mapping?.importType === importType
    );

    let normalization;
    let mappingSource;

    if (approvedMapping) {
      const mappingObject = {};

      for (const suggestion of approvedMapping.mapping.suggestions) {
        mappingObject[suggestion.suggestedField] =
          suggestion.originalHeader;
      }

      normalization = normalizeColumnsWithApprovedMapping(
        records,
        mappingObject
      );

      mappingSource = "APPROVED_AI_MAPPING";

      console.log(
        `Reusing approved mapping version ${approvedMapping.version}`
      );
    } else {
      normalization = normalizeColumns(records, importType);
      mappingSource = "DEFAULT_ALIAS_MAPPING";

      console.log(`Using default alias mapping for ${importType}.`);

      // Generate and persist AI Column Mapping suggestions for review
      try {
        const rawHeaders = Object.keys(records[0] || {});
        if (rawHeaders.length > 0) {
          const aiMapping = await suggestColumnMappings(rawHeaders, importType);
          if (aiMapping?.suggestions?.length > 0) {
            await saveColumnMappingSuggestions({
              importBatchId: importBatch.id,
              suggestions: aiMapping.suggestions,
            });
          }
        }
      } catch (mappingErr) {
        console.warn(
          "Could not generate AI column mapping suggestions:",
          mappingErr.message
        );
      }
    }

    // 3. Validate normalized records.
    const validation = validateImportRecords(
  normalization.normalizedRecords,
  {
    importType,
    duplicateKey:
      importType === "SETTLEMENTS"
        ? "settlementReference"
        : "orderNumber",
  }
);

    // 4. Identify rejected rows using their original row numbers.
    const rejectedByRow = new Map(
      validation.rejectedRecords.map((item) => [
        item.rowNumber,
        item,
      ])
    );

    // 5. Preserve every original row and its validation result.
    
const sourceRecords = records.map((record, index) => {
  const rowNumber = index + 2;
  const rejection = rejectedByRow.get(rowNumber);

  const normalizedRecord = normalization.normalizedRecords[index];

  return {
    importBatchId: importBatch.id,
    rowNumber,
    rawData: record,
    normalizedData: rejection
      ? {
          ...normalizedRecord,
          validationStatus: "REJECTED",
          errors: rejection.errors,
        }
      : {
          ...normalizedRecord,
          validationStatus: "VALID",
        },
    processed: false,
  };
});


    // 6. Concurrently persist SourceRecords and Domain tables in high-speed 5,000-row chunks
    const CHUNK_SIZE = 5000;

    const sourceRecordInsertionPromise = (async () => {
      for (let i = 0; i < sourceRecords.length; i += CHUNK_SIZE) {
        const chunk = sourceRecords.slice(i, i + CHUNK_SIZE);
        await prisma.sourceRecord.createMany({
          data: chunk,
        });
      }
    })();

    const domainInsertionPromise = (async () => {
      if (validation.validRecords.length > 0) {
        if (importType === "ORDERS") {
          const existingPartners = await prisma.partner.findMany();
          const partnerMap = new Map(
            existingPartners.map((p) => [p.name.trim().toLowerCase(), p.id])
          );

          // Collect all unique partner/channel names from valid records
          const partnerNamesToEnsure = new Set();
          for (const rec of validation.validRecords) {
            const name = (rec.partnerName || rec.channel || "").trim();
            if (name) partnerNamesToEnsure.add(name);
          }

          for (const name of partnerNamesToEnsure) {
            const key = name.toLowerCase();
            if (!partnerMap.has(key)) {
              const type = key.includes("website")
                ? "DIRECT_CHANNEL"
                : key.includes("quick")
                  ? "QUICK_COMMERCE"
                  : "MARKETPLACE";

              const newPartner = await prisma.partner.create({
                data: { name, type },
              });
              partnerMap.set(key, newPartner.id);
            }
          }

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
        } else if (importType === "SETTLEMENTS" || importType === "COD") {
          const orderNumbers = [...new Set(validation.validRecords.map((r) => r.orderNumber).filter(Boolean))];
          const orderMap = new Map();

          for (let i = 0; i < orderNumbers.length; i += CHUNK_SIZE) {
            const chunk = orderNumbers.slice(i, i + CHUNK_SIZE);
            const foundOrders = await prisma.order.findMany({
              where: { orderNumber: { in: chunk } },
              select: { id: true, orderNumber: true, partnerId: true },
            });
            for (const o of foundOrders) {
              orderMap.set(o.orderNumber, o);
            }
          }

          const settlementsToInsert = [];
          for (const rec of validation.validRecords) {
            const order = orderMap.get(rec.orderNumber);
            if (order) {
              settlementsToInsert.push({
                orderId: order.id,
                partnerId: order.partnerId || null,
                importBatchId: importBatch.id,
                referenceNumber: rec.settlementReference || rec.referenceNumber || null,
                amountReceived: rec.amount || rec.remittedAmount,
                grossAmount: rec.grossAmount ?? null,
                commissionAmount: rec.commissionAmount ?? 0,
                otherFeeAmount: rec.otherFeeAmount ?? 0,
                tcsAmount: rec.tcsAmount ?? 0,
                tdsAmount: rec.tdsAmount ?? 0,
                settlementDate: rec.settlementDate || rec.remittanceDate || new Date(),
              });
            }
          }

          for (let i = 0; i < settlementsToInsert.length; i += CHUNK_SIZE) {
            const chunk = settlementsToInsert.slice(i, i + CHUNK_SIZE);
            await prisma.settlement.createMany({
              data: chunk,
              skipDuplicates: true,
            });
          }
        } else if (importType === "FREIGHT") {
          const orderNumbers = [...new Set(validation.validRecords.map((r) => r.orderNumber).filter(Boolean))];
          const orderMap = new Map();

          for (let i = 0; i < orderNumbers.length; i += CHUNK_SIZE) {
            const chunk = orderNumbers.slice(i, i + CHUNK_SIZE);
            const foundOrders = await prisma.order.findMany({
              where: { orderNumber: { in: chunk } },
              select: { id: true, orderNumber: true },
            });
            for (const o of foundOrders) {
              orderMap.set(o.orderNumber, o.id);
            }
          }

          const freightToInsert = [];
          for (const rec of validation.validRecords) {
            const orderId = orderMap.get(rec.orderNumber);
            if (orderId) {
              freightToInsert.push({
                orderId,
                courierName: rec.courierName,
                chargedAmount: rec.chargedAmount,
                actualWeight: rec.actualWeight,
                invoiceNumber: rec.invoiceNumber || null,
                chargedAt: rec.chargedAt || new Date(),
              });
            }
          }

          for (let i = 0; i < freightToInsert.length; i += CHUNK_SIZE) {
            const chunk = freightToInsert.slice(i, i + CHUNK_SIZE);
            await prisma.freightCharge.createMany({
              data: chunk,
              skipDuplicates: true,
            });
          }
        } else if (importType === "RETURNS") {
          const orderNumbers = [...new Set(validation.validRecords.map((r) => r.orderNumber).filter(Boolean))];
          const orderMap = new Map();

          for (let i = 0; i < orderNumbers.length; i += CHUNK_SIZE) {
            const chunk = orderNumbers.slice(i, i + CHUNK_SIZE);
            const foundOrders = await prisma.order.findMany({
              where: { orderNumber: { in: chunk } },
              select: { id: true, orderNumber: true },
            });
            for (const o of foundOrders) {
              orderMap.set(o.orderNumber, o.id);
            }
          }

          const returnsToInsert = [];
          for (const rec of validation.validRecords) {
            const orderId = orderMap.get(rec.orderNumber);
            if (orderId) {
              returnsToInsert.push({
                orderId,
                returnDate: rec.returnDate,
                status: rec.returnStatus || "RETURN_INITIATED",
                warehouseReceivedAt: null,
              });
            }
          }

          for (let i = 0; i < returnsToInsert.length; i += CHUNK_SIZE) {
            const chunk = returnsToInsert.slice(i, i + CHUNK_SIZE);
            await prisma.returnRecord.createMany({
              data: chunk,
              skipDuplicates: true,
            });
          }
        } else if (importType === "WAREHOUSE_RECEIPTS") {
          const orderNumbers = [...new Set(validation.validRecords.map((r) => r.orderNumber).filter(Boolean))];
          const orderMap = new Map();

          for (let i = 0; i < orderNumbers.length; i += CHUNK_SIZE) {
            const chunk = orderNumbers.slice(i, i + CHUNK_SIZE);
            const foundOrders = await prisma.order.findMany({
              where: { orderNumber: { in: chunk } },
              select: { id: true, orderNumber: true },
            });
            for (const o of foundOrders) {
              orderMap.set(o.orderNumber, o.id);
            }
          }

          for (const rec of validation.validRecords) {
            const orderId = orderMap.get(rec.orderNumber);
            if (orderId) {
              const existingReturn = await prisma.returnRecord.findFirst({
                where: { orderId, warehouseReceivedAt: null },
              });
              if (existingReturn) {
                await prisma.returnRecord.update({
                  where: { id: existingReturn.id },
                  data: {
                    warehouseReceivedAt: rec.warehouseReceivedAt,
                    status: "RECEIVED",
                  },
                });
              } else {
                await prisma.returnRecord.create({
                  data: {
                    orderId,
                    returnDate: rec.warehouseReceivedAt,
                    status: rec.status || "RECEIVED",
                    warehouseReceivedAt: rec.warehouseReceivedAt,
                  },
                });
              }
            }
          }
        }
      }
    })();

    await Promise.all([sourceRecordInsertionPromise, domainInsertionPromise]);

    await prisma.importBatch.update({
      where: {
        id: importBatch.id,
      },
      data: {
        rowCount: validation.totalRows,
        status: "COMPLETED",
      },
    });

    // Automatically trigger 3-way reconciliation in background whenever new records are imported
    // so all dashboard metrics, status breakdowns, and claims update immediately.
    if (validation.validCount > 0) {
      import("./reconciliationRepository.js")
        .then(({ runReconciliation }) => runReconciliation())
        .catch((err) =>
          console.error("Auto-reconciliation error after import:", err)
        );
    }

    return {
      importBatchId: importBatch.id,
      mappingSource,
      fileName: file.originalname,
      importType,
      totalRows: validation.totalRows,
      validCount: validation.validCount,
      rejectedCount: validation.rejectedCount,
      duplicateCount: validation.duplicateCount ?? 0,
      skippedCount: validation.skippedCount ?? 0,
      errorSummary: validation.errorSummary ?? {},
      columnMapping: normalization.columnMapping,
      unmappedHeaders: normalization.unmappedHeaders,
      rejectedRecords: validation.rejectedRecords.slice(0, 50),
    };
  } catch (error) {
    await prisma.importBatch.update({
      where: {
        id: importBatch.id,
      },
      data: {
        status: "FAILED",
      },
    });

    throw error;
  }
}

import Decimal from "decimal.js";
import prisma from "../config/database.js";
import { parseUploadedFile } from "../imports/parsers/fileParser.js";
import {
  normalizeColumns,
  normalizeColumnsWithApprovedMapping,
  detectCategoryFromHeaders,
} from "../imports/normalizers/columnNormalizer.js";
import { validateImportRecords, parseDateSafe } from "../imports/validators/importValidator.js";
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
      importType: importType || "ORDERS",
      status: "PROCESSING",
      uploadedById: userId,
    },
  });

  try {
    // 1. Parse the uploaded file (supports universal delimiters, preambles, and Excel formats)
    const records = await parseUploadedFile(file.path);

    if (records.length === 0) {
      throw new Error("Uploaded file contains no records.");
    }

    // Auto-detect and align import category based on file headers and filename
    const rawHeaders = Object.keys(records[0] || {});
    const detectedCategory = detectCategoryFromHeaders(rawHeaders, file.originalname);
    let effectiveImportType = importType || detectedCategory;

    if (importType && detectedCategory !== importType) {
      console.log(
        `Auto-aligned import category from "${importType}" to "${detectedCategory}" based on file column signatures.`
      );
      effectiveImportType = detectedCategory;
      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: { importType: detectedCategory },
      });
    }

    // 2. Find the latest approved mapping for this source.
    // Also capture previous reconciliation status counts to compute live change delta
    const [approvedMappings, prevRun] = await Promise.all([
      prisma.columnMapping.findMany({
        where: {
          sourceName: file.originalname,
          approved: true,
        },
        orderBy: {
          version: "desc",
        },
      }),
      prisma.reconciliationRun.findFirst({
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
      }),
    ]);

    const prevStatusCounts = {
      TOTAL: 0,
      SETTLED: 0,
      SHORT_PAID: 0,
      UNPAID_PAST_DUE: 0,
      FREIGHT_OVERCHARGED: 0,
      RETURN_NOT_RECEIVED: 0,
      REVIEW_REQUIRED: 0,
    };

    if (prevRun) {
      const matchCounts = await prisma.reconciliationMatch.groupBy({
        by: ["status"],
        where: { runId: prevRun.id },
        _count: { status: true },
      });
      for (const m of matchCounts) {
        if (m.status in prevStatusCounts) {
          prevStatusCounts[m.status] = m._count.status;
        }
      }
      prevStatusCounts.FREIGHT_OVERCHARGED = await prisma.reconciliationMatch.count({
        where: { runId: prevRun.id, freightStatus: "FREIGHT_OVERCHARGED" },
      });
      prevStatusCounts.RETURN_NOT_RECEIVED = await prisma.reconciliationMatch.count({
        where: { runId: prevRun.id, returnStatus: "RETURN_NOT_RECEIVED" },
      });
      prevStatusCounts.TOTAL = await prisma.reconciliationMatch.count({
        where: { runId: prevRun.id },
      });
    }

    const approvedMapping = approvedMappings.find(
      (item) => item.mapping?.importType === effectiveImportType
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
      normalization = normalizeColumns(records, effectiveImportType);
      mappingSource = "DEFAULT_ALIAS_MAPPING";

      console.log(`Using default alias mapping for ${effectiveImportType}.`);

      // Generate and persist AI Column Mapping suggestions for review
      try {
        if (rawHeaders.length > 0) {
          const aiMapping = await suggestColumnMappings(rawHeaders, effectiveImportType);
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
        importType: effectiveImportType,
        duplicateKey:
          effectiveImportType === "SETTLEMENTS"
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
        if (effectiveImportType === "ORDERS") {
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
        } else if (effectiveImportType === "SETTLEMENTS" || effectiveImportType === "COD") {
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

          // Auto-healing: auto-provision missing orders so settlements always attach cleanly
          const missingOrderNumbers = orderNumbers.filter((n) => !orderMap.has(n));
          if (missingOrderNumbers.length > 0) {
            const autoOrders = missingOrderNumbers.map((num) => {
              const sampleRec = validation.validRecords.find((r) => r.orderNumber === num);
              const gross = Number(sampleRec?.grossAmount || sampleRec?.amount || 1000);
              const orderDate = sampleRec?.settlementDate ? (parseDateSafe(sampleRec.settlementDate) || new Date()) : new Date();

              return {
                orderNumber: num,
                channel: sampleRec?.partnerName || "Marketplace",
                orderDate,
                paymentMode: effectiveImportType === "COD" ? "COD" : "Prepaid",
                deliveryStatus: "Delivered",
                orderValue: gross,
                expectedSettlementAmount: Number((gross * 0.88).toFixed(2)),
                settlementDueAt: orderDate,
                weightKg: 0.5,
              };
            });

            for (let i = 0; i < autoOrders.length; i += CHUNK_SIZE) {
              await prisma.order.createMany({
                data: autoOrders.slice(i, i + CHUNK_SIZE),
                skipDuplicates: true,
              });
            }

            for (let i = 0; i < missingOrderNumbers.length; i += CHUNK_SIZE) {
              const chunk = missingOrderNumbers.slice(i, i + CHUNK_SIZE);
              const newlyCreated = await prisma.order.findMany({
                where: { orderNumber: { in: chunk } },
                select: { id: true, orderNumber: true, partnerId: true },
              });
              for (const o of newlyCreated) {
                orderMap.set(o.orderNumber, o);
              }
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
                amountReceived: rec.amount || rec.remittedAmount || "0.00",
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
        } else if (effectiveImportType === "FREIGHT") {
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

          // Auto-healing for missing freight orders
          const missingNumbers = orderNumbers.filter((n) => !orderMap.has(n));
          if (missingNumbers.length > 0) {
            const autoOrders = missingNumbers.map((num) => ({
              orderNumber: num,
              channel: "Direct",
              orderDate: new Date(),
              paymentMode: "Prepaid",
              deliveryStatus: "Delivered",
              orderValue: 1200,
              expectedSettlementAmount: 1050,
              settlementDueAt: new Date(),
              weightKg: 0.5,
            }));
            for (let i = 0; i < autoOrders.length; i += CHUNK_SIZE) {
              await prisma.order.createMany({
                data: autoOrders.slice(i, i + CHUNK_SIZE),
                skipDuplicates: true,
              });
            }
            for (let i = 0; i < missingNumbers.length; i += CHUNK_SIZE) {
              const chunk = missingNumbers.slice(i, i + CHUNK_SIZE);
              const newlyCreated = await prisma.order.findMany({
                where: { orderNumber: { in: chunk } },
                select: { id: true, orderNumber: true },
              });
              for (const o of newlyCreated) {
                orderMap.set(o.orderNumber, o.id);
              }
            }
          }

          const freightToInsert = [];
          for (const rec of validation.validRecords) {
            const orderId = orderMap.get(rec.orderNumber);
            if (orderId) {
              freightToInsert.push({
                orderId,
                courierName: rec.courierName || "Standard Courier",
                chargedAmount: rec.chargedAmount || "0.00",
                actualWeight: rec.actualWeight || "0.500",
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
        } else if (effectiveImportType === "RETURNS") {
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

          // Auto-healing for missing return orders
          const missingNumbers = orderNumbers.filter((n) => !orderMap.has(n));
          if (missingNumbers.length > 0) {
            const autoOrders = missingNumbers.map((num) => ({
              orderNumber: num,
              channel: "Marketplace",
              orderDate: new Date(),
              paymentMode: "COD",
              deliveryStatus: "Returned",
              orderValue: 1200,
              expectedSettlementAmount: 1050,
              settlementDueAt: new Date(),
              weightKg: 0.5,
            }));
            for (let i = 0; i < autoOrders.length; i += CHUNK_SIZE) {
              await prisma.order.createMany({
                data: autoOrders.slice(i, i + CHUNK_SIZE),
                skipDuplicates: true,
              });
            }
            for (let i = 0; i < missingNumbers.length; i += CHUNK_SIZE) {
              const chunk = missingNumbers.slice(i, i + CHUNK_SIZE);
              const newlyCreated = await prisma.order.findMany({
                where: { orderNumber: { in: chunk } },
                select: { id: true, orderNumber: true },
              });
              for (const o of newlyCreated) {
                orderMap.set(o.orderNumber, o.id);
              }
            }
          }

          const returnsToInsert = [];
          for (const rec of validation.validRecords) {
            const orderId = orderMap.get(rec.orderNumber);
            if (orderId) {
              returnsToInsert.push({
                orderId,
                returnDate: rec.returnDate || new Date(),
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
        } else if (effectiveImportType === "WAREHOUSE_RECEIPTS") {
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

    // Calculate financial amounts added in this batch
    let totalExpectedAmountAdded = new Decimal(0);
    let totalReceivedAmountAdded = new Decimal(0);
    let totalTcsAmountAdded = new Decimal(0);
    let totalTdsAmountAdded = new Decimal(0);
    let totalFreightAmountAdded = new Decimal(0);

    for (const rec of (validation.validRecords || [])) {
      if (rec.expectedSettlementAmount) totalExpectedAmountAdded = totalExpectedAmountAdded.plus(rec.expectedSettlementAmount);
      if (rec.amount) totalReceivedAmountAdded = totalReceivedAmountAdded.plus(rec.amount);
      if (rec.tcsAmount) totalTcsAmountAdded = totalTcsAmountAdded.plus(rec.tcsAmount);
      if (rec.tdsAmount) totalTdsAmountAdded = totalTdsAmountAdded.plus(rec.tdsAmount);
      if (rec.freightAmount) totalFreightAmountAdded = totalFreightAmountAdded.plus(rec.freightAmount);
    }

    // Run 3-way reconciliation and compute exact change deltas
    let reconciliationResult = null;
    const changeDelta = {
      recordsProcessed: validation.totalRows,
      recordsAdded: validation.validCount,
      rejectedCount: validation.rejectedCount,
      duplicateCount: validation.duplicateCount ?? 0,
      importType: effectiveImportType,
      fileName: file.originalname,
      totalOrdersDelta: 0,
      settledDelta: 0,
      shortPaidDelta: 0,
      unpaidPastDueDelta: 0,
      freightOverchargedDelta: 0,
      returnNotReceivedDelta: 0,
      reviewRequiredDelta: 0,
      totalExpectedAmountAdded: totalExpectedAmountAdded.toFixed(2),
      totalReceivedAmountAdded: totalReceivedAmountAdded.toFixed(2),
      totalTcsAmountAdded: totalTcsAmountAdded.toFixed(2),
      totalTdsAmountAdded: totalTdsAmountAdded.toFixed(2),
      totalFreightAmountAdded: totalFreightAmountAdded.toFixed(2),
      previousCounts: prevStatusCounts,
      newCounts: null,
    };

    if (validation.validCount > 0) {
      try {
        const { runReconciliation } = await import("./reconciliationRepository.js");
        reconciliationResult = await runReconciliation();
        if (reconciliationResult?.statusCounts) {
          const cur = reconciliationResult.statusCounts;
          changeDelta.newCounts = cur;
          changeDelta.totalOrdersDelta = (cur.TOTAL || 0) - (prevStatusCounts.TOTAL || 0);
          changeDelta.settledDelta = (cur.SETTLED || 0) - (prevStatusCounts.SETTLED || 0);
          changeDelta.shortPaidDelta = (cur.SHORT_PAID || 0) - (prevStatusCounts.SHORT_PAID || 0);
          changeDelta.unpaidPastDueDelta = (cur.UNPAID_PAST_DUE || 0) - (prevStatusCounts.UNPAID_PAST_DUE || 0);
          changeDelta.freightOverchargedDelta = (cur.FREIGHT_OVERCHARGED || 0) - (prevStatusCounts.FREIGHT_OVERCHARGED || 0);
          changeDelta.returnNotReceivedDelta = (cur.RETURN_NOT_RECEIVED || 0) - (prevStatusCounts.RETURN_NOT_RECEIVED || 0);
          changeDelta.reviewRequiredDelta = (cur.REVIEW_REQUIRED || 0) - (prevStatusCounts.REVIEW_REQUIRED || 0);
        }
      } catch (err) {
        console.error("Auto-reconciliation error after import:", err);
      }
    }

    return {
      importBatchId: importBatch.id,
      mappingSource,
      fileName: file.originalname,
      importType: effectiveImportType,
      totalRows: validation.totalRows,
      validCount: validation.validCount,
      rejectedCount: validation.rejectedCount,
      duplicateCount: validation.duplicateCount ?? 0,
      skippedCount: validation.skippedCount ?? 0,
      errorSummary: validation.errorSummary ?? {},
      columnMapping: normalization.columnMapping,
      unmappedHeaders: normalization.unmappedHeaders,
      rejectedRecords: validation.rejectedRecords.slice(0, 50),
      changeDelta,
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

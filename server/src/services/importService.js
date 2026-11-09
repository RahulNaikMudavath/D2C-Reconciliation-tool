
import prisma from "../config/database.js";
import { parseUploadedFile } from "../imports/parsers/fileParser.js";
import {
  normalizeColumns,
  normalizeColumnsWithApprovedMapping,
} from "../imports/normalizers/columnNormalizer.js";
import { validateImportRecords } from "../imports/validators/importValidator.js";

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
      normalization = normalizeColumns(records);
      mappingSource = "DEFAULT_ALIAS_MAPPING";

      console.log("No approved mapping found. Using default aliases.");
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


    // 6. Save all rows in chunks to handle 100k+ records smoothly.
    const CHUNK_SIZE = 5000;
    for (let i = 0; i < sourceRecords.length; i += CHUNK_SIZE) {
      const chunk = sourceRecords.slice(i, i + CHUNK_SIZE);
      await prisma.sourceRecord.createMany({
        data: chunk,
      });
    }

    // 7. For ORDERS imports, populate the Order table for reconciliation.
    if (importType === "ORDERS" && validation.validRecords.length > 0) {
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
    }

    await prisma.importBatch.update({
      where: {
        id: importBatch.id,
      },
      data: {
        rowCount: validation.totalRows,
        status: "COMPLETED",
      },
    });

    return {
      importBatchId: importBatch.id,
      mappingSource,
      fileName: file.originalname,
      importType,
      totalRows: validation.totalRows,
      validCount: validation.validCount,
      rejectedCount: validation.rejectedCount,
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

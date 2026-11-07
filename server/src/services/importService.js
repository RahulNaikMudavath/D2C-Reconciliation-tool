
import prisma from "../config/database.js";
import { parseUploadedFile } from "../imports/parsers/fileParser.js";
import { normalizeColumns } from "../imports/normalizers/columnNormalizer.js";
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

    // 2. Normalize column names.
    const normalization = normalizeColumns(records);

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


    // 6. Save all rows and complete the import batch atomically.
    await prisma.$transaction(async (tx) => {
      await tx.sourceRecord.createMany({
        data: sourceRecords,
      });

      await tx.importBatch.update({
        where: {
          id: importBatch.id,
        },
        data: {
          rowCount: validation.totalRows,
          status: "COMPLETED",
        },
      });
    });

    return {
      importBatchId: importBatch.id,
      fileName: file.originalname,
      importType,
      totalRows: validation.totalRows,
      validCount: validation.validCount,
      rejectedCount: validation.rejectedCount,
      columnMapping: normalization.columnMapping,
      unmappedHeaders: normalization.unmappedHeaders,
      rejectedRecords: validation.rejectedRecords,
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

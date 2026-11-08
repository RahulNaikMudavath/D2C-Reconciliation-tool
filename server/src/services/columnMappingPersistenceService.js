import prisma from "../config/database.js";

export async function saveColumnMappingSuggestions({
  importBatchId,
  suggestions,
}) {
  if (!importBatchId) {
    throw new Error("Import batch ID is required.");
  }

  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    throw new Error("No column mapping suggestions to save.");
  }

  return prisma.$transaction(async (tx) => {
    const batch = await tx.importBatch.findUnique({
      where: { id: importBatchId },
    });

    if (!batch) {
      throw new Error("Import batch not found.");
    }

    const latestMapping = await tx.columnMapping.aggregate({
      where: {
        sourceName: batch.fileName,
      },
      _max: {
        version: true,
      },
    });

    const nextVersion = (latestMapping._max.version || 0) + 1;

    const savedMapping = await tx.columnMapping.create({
      data: {
        sourceName: batch.fileName,
        version: nextVersion,
        mapping: {
          importType: batch.importType,
          suggestions,
        },
        approved: false,
        importBatchId: batch.id,
      },
    });

    return savedMapping;
  });
}

import prisma from "../config/database.js";

export async function getImportDetails(importBatchId) {
  const importBatch = await prisma.importBatch.findUnique({
    where: {
      id: importBatchId,
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      sourceRecords: {
        orderBy: {
          rowNumber: "asc",
        },
      },
    },
  });

  if (!importBatch) {
    const error = new Error("Import batch not found.");
    error.statusCode = 404;
    throw error;
  }

  return importBatch;
}
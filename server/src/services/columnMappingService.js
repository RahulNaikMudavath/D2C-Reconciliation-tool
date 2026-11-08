import prisma from "../config/database.js";

export async function approveColumnMapping({
  mappingId,
  userId,
}) {
  return prisma.$transaction(async (tx) => {
    const mapping = await tx.columnMapping.findUnique({
      where: { id: mappingId },
    });

    if (!mapping) {
      const err = new Error("Column mapping not found.");
      err.statusCode = 404;
      throw err;
    }

    if (mapping.approved) {
      const err = new Error("This mapping is already approved.");
      err.statusCode = 400;
      throw err;
    }

    const updatedMapping = await tx.columnMapping.update({
      where: { id: mappingId },
      data: {
        approved: true,
        approvedAt: new Date(),
        approvedById: userId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: "COLUMN_MAPPING_APPROVED",
        entity: "ColumnMapping",
        entityId: mappingId,
        details: {
          sourceName: mapping.sourceName,
          version: mapping.version,
        },
      },
    });

    return updatedMapping;
  });
}

export async function rejectColumnMapping({
  mappingId,
  userId,
  rejectionReason,
}) {
  if (
    typeof rejectionReason !== "string" ||
    !rejectionReason.trim()
  ) {
    throw new Error("A rejection reason is required.");
  }

  if (rejectionReason.trim().length > 1000) {
    throw new Error("Rejection reason cannot exceed 1000 characters.");
  }

  return prisma.$transaction(async (tx) => {
    const mapping = await tx.columnMapping.findUnique({
      where: { id: mappingId },
    });

    if (!mapping) {
      const err = new Error("Column mapping not found.");
      err.statusCode = 404;
      throw err;
    }

    if (mapping.approved) {
      const err = new Error("An approved mapping cannot be rejected.");
      err.statusCode = 400;
      throw err;
    }

    if (mapping.rejected) {
      const err = new Error("This mapping is already rejected.");
      err.statusCode = 400;
      throw err;
    }

    const updatedMapping = await tx.columnMapping.update({
      where: { id: mappingId },
      data: {
        rejected: true,
        rejectedAt: new Date(),
        rejectedById: userId,
        rejectionReason: rejectionReason.trim(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: "COLUMN_MAPPING_REJECTED",
        entity: "ColumnMapping",
        entityId: mappingId,
        details: {
          sourceName: mapping.sourceName,
          version: mapping.version,
          rejectionReason: rejectionReason.trim(),
        },
      },
    });

    return updatedMapping;
  });
}

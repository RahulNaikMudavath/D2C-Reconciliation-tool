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
      throw new Error("Column mapping not found.");
    }

    if (mapping.approved) {
      throw new Error("This mapping is already approved.");
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

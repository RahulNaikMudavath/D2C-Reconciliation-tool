import prisma from "../config/database.js";

export async function getImportHistory() {
  return prisma.importBatch.findMany({
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      uploadedAt: "desc",
    },
    take: 50,
  });
}
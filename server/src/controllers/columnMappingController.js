import prisma from "../config/database.js";

export async function getColumnMappings(req, res, next) {
  try {
    const { status } = req.query;

    const where = {};

    if (status === "PENDING") {
      where.approved = false;
    } else if (status === "APPROVED") {
      where.approved = true;
    } else if (status && status !== "ALL") {
      return res.status(400).json({
        success: false,
        message: "Invalid mapping status.",
      });
    }

    const mappings = await prisma.columnMapping.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        sourceName: true,
        version: true,
        mapping: true,
        approved: true,
        approvedAt: true,
        approvedById: true,
        createdAt: true,
        importBatchId: true,
        importBatch: {
          select: {
            importType: true,
            fileName: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      count: mappings.length,
      data: mappings,
    });
  } catch (error) {
    next(error);
  }
}

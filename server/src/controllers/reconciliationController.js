import { runReconciliation } from "../services/reconciliationRepository.js";
import prisma from "../config/database.js";

export async function startReconciliation(req, res, next) {
  try {
    const result = await runReconciliation();

    return res.status(200).json({
      success: true,
      message: "Reconciliation completed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getReconciliationResults(req, res, next) {
  try {
    const latestRun = await prisma.reconciliationRun.findFirst({
      where: {
        status: "COMPLETED",
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    if (!latestRun) {
      return res.status(200).json({
        success: true,
        data: {
          runId: null,
          totalOrders: 0,
          results: [],
        },
      });
    }

    const totalCount = await prisma.reconciliationMatch.count({
      where: { runId: latestRun.id },
    });

    const [statusGroup, freightGroup, returnGroup] = await Promise.all([
      prisma.reconciliationMatch.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { runId: latestRun.id },
      }),
      prisma.reconciliationMatch.groupBy({
        by: ["freightStatus"],
        _count: { id: true },
        where: { runId: latestRun.id },
      }),
      prisma.reconciliationMatch.groupBy({
        by: ["returnStatus"],
        _count: { id: true },
        where: { runId: latestRun.id },
      }),
    ]);

    const statusCounts = {
      TOTAL: totalCount,
      SETTLED: 0,
      SHORT_PAID: 0,
      UNPAID_PAST_DUE: 0,
      FREIGHT_OVERCHARGED: 0,
      RETURN_NOT_RECEIVED: 0,
      REVIEW_REQUIRED: 0,
    };

    for (const g of statusGroup) {
      if (g.status === "SETTLED") statusCounts.SETTLED += g._count.id;
      if (g.status === "SHORT_PAID") statusCounts.SHORT_PAID += g._count.id;
      if (g.status === "UNPAID_PAST_DUE") statusCounts.UNPAID_PAST_DUE += g._count.id;
      if (g.status === "REVIEW_REQUIRED") statusCounts.REVIEW_REQUIRED += g._count.id;
    }

    for (const g of freightGroup) {
      if (g.freightStatus === "FREIGHT_OVERCHARGED") statusCounts.FREIGHT_OVERCHARGED += g._count.id;
      if (g.freightStatus === "REVIEW_REQUIRED") statusCounts.REVIEW_REQUIRED += g._count.id;
    }

    for (const g of returnGroup) {
      if (g.returnStatus === "RETURN_NOT_RECEIVED") statusCounts.RETURN_NOT_RECEIVED += g._count.id;
      if (g.returnStatus === "REVIEW_REQUIRED") statusCounts.REVIEW_REQUIRED += g._count.id;
    }

    const matches = await prisma.reconciliationMatch.findMany({
      where: {
        runId: latestRun.id,
      },
      take: 1000,
      include: {
        order: {
          select: {
            orderNumber: true,
            channel: true,
            orderDate: true,
            orderValue: true,
            weightKg: true,
            partner: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        runId: latestRun.id,
        totalOrders: totalCount,
        statusCounts,
        results: matches.map((match) => ({
          orderNumber: match.order.orderNumber,
          channel: match.order.channel,
          partnerName: match.order.partner?.name ?? "Unknown",
          orderDate: match.order.orderDate,
          orderValue: match.order.orderValue.toString(),
          weightKg: match.order.weightKg?.toString() ?? null,

          // Settlement
          status: match.status,
          expectedAmount: match.expectedAmount?.toString() ?? null,
          actualAmount: match.actualAmount?.toString() ?? null,
          difference: match.difference?.toString() ?? null,
          settlement: {
            status: match.status,
            expectedAmount: match.expectedAmount?.toString() ?? null,
            actualAmount: match.actualAmount?.toString() ?? null,
            difference: match.difference?.toString() ?? null,
          },

          // Freight
          freightStatus: match.freightStatus,
          expectedFreightAmount:
            match.expectedFreightAmount?.toString() ?? null,
          actualFreightAmount:
            match.actualFreightAmount?.toString() ?? null,
          freightDifference:
            match.freightDifference?.toString() ?? null,
          freight: {
            status: match.freightStatus,
            expectedAmount:
              match.expectedFreightAmount?.toString() ?? null,
            actualAmount:
              match.actualFreightAmount?.toString() ?? null,
            difference:
              match.freightDifference?.toString() ?? null,
          },

          // Return
          returnStatus: match.returnStatus,
          returnRecordId: match.returnRecordId,
          return: {
            recordId: match.returnRecordId,
            status: match.returnStatus,
          },

          reviewReason: match.reviewReason,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
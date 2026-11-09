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

    const matches = await prisma.reconciliationMatch.findMany({
      where: {
        runId: latestRun.id,
      },
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
        totalOrders: matches.length,
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
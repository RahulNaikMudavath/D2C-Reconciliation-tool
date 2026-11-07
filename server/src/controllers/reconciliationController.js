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
          status: match.status,
          expectedAmount: match.expectedAmount?.toString() ?? null,
          actualAmount: match.actualAmount?.toString() ?? null,
          difference: match.difference?.toString() ?? null,
          reviewReason: match.reviewReason,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
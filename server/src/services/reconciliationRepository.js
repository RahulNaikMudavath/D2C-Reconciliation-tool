
import prisma from "../config/database.js";
import { reconcileSettlement } from "./reconciliationService.js";
import { toMoney, formatMoney } from "../utils/money.js";

export async function runReconciliation() {
  // 1. Fetch orders and their settlement records.
  const orders = await prisma.order.findMany({
    include: {
      settlements: true,
    },
    orderBy: {
      orderDate: "asc",
    },
  });

  if (orders.length === 0) {
    throw new Error("No orders found for reconciliation.");
  }

  // 2. Start a new reconciliation run.
  const run = await prisma.reconciliationRun.create({
    data: {
      status: "PROCESSING",
    },
  });

  try {
    // 3. Calculate and prepare a result for each order.
    const results = orders.map((order) => {
  // Prefer imported settlements when available.
  const importedSettlements = order.settlements.filter(
    (settlement) => settlement.importBatchId !== null
  );

  // Otherwise, retain existing seed/demo settlements.
  const selectedSettlements =
    importedSettlements.length > 0
      ? importedSettlements
      : order.settlements;

  // Aggregate selected payments using Decimal.js.
  const actualAmount = selectedSettlements.reduce(
    (total, settlement) =>
      total.plus(toMoney(settlement.amountReceived)),
    toMoney(0)
  );

  const hasSettlements = selectedSettlements.length > 0;

  const result = reconcileSettlement({
    expectedAmount: order.expectedSettlementAmount,
    actualAmount: hasSettlements ? actualAmount : null,
    dueDate: order.settlementDueAt,
  });

      return {
        order,
        result,
        settlements: selectedSettlements,
        actualAmount: hasSettlements
          ? formatMoney(actualAmount)
          : null,
      };
    });

    // 4. Save matches and settlement links atomically.
    await prisma.$transaction(async (tx) => {
      for (const item of results) {
        const match = await tx.reconciliationMatch.create({
          data: {
            runId: run.id,
            orderId: item.order.id,
            status: item.result.status,
            expectedAmount: item.result.expectedAmount,
            actualAmount: item.actualAmount,
            difference: item.result.difference,
            reviewReason: item.result.reviewReason,
          },
        });

        if (item.settlements.length > 0) {
          await tx.matchSettlement.createMany({
            data: item.settlements.map((settlement) => ({
              reconciliationMatchId: match.id,
              settlementId: settlement.id,
            })),
          });
        }
      }

      // 5. Mark the run as completed.
      await tx.reconciliationRun.update({
        where: {
          id: run.id,
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    });

    return {
      runId: run.id,
      totalOrders: results.length,
      results: results.map(({ order, result }) => ({
        orderNumber: order.orderNumber,
        ...result,
      })),
    };
  } catch (error) {
    // If saving fails, record the failed run.
    await prisma.reconciliationRun.update({
      where: {
        id: run.id,
      },
      data: {
        status: "FAILED",
        completedAt: new Date(),
      },
    });

    throw error;
  }
}


import prisma from "../config/database.js";
import { reconcileSettlement } from "./reconciliationService.js";
import { reconcileFreight } from "./freightReconciliationService.js";
import { toMoney, formatMoney } from "../utils/money.js";
import { calculateExpectedSettlement } from "./rateCardService.js";

const FREIGHT_THRESHOLD = toMoney(10);

export async function runReconciliation() {
  // 1. Fetch orders with their settlement and freight records.
  const orders = await prisma.order.findMany({
    include: {
      settlements: true,
      freightCharges: true,
      returns: true,
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
    // 3. Calculate settlement and freight results for each order.
    const results = await Promise.all(
      orders.map(async (order) => {
        // ---------------- SETTLEMENT RECONCILIATION ----------------

        const importedSettlements = order.settlements.filter(
          (settlement) => settlement.importBatchId !== null
        );

        const selectedSettlements =
          importedSettlements.length > 0
            ? importedSettlements
            : order.settlements;

        const actualAmount = selectedSettlements.reduce(
          (total, settlement) =>
            total.plus(toMoney(settlement.amountReceived)),
          toMoney(0)
        );

        const hasSettlements = selectedSettlements.length > 0;

        const rateCardResult = order.partnerId
          ? await calculateExpectedSettlement({
              partnerId: order.partnerId,
              channel: order.channel,
              orderValue: order.orderValue,
              orderDate: order.orderDate,
            })
          : { success: false };

        const expectedAmount = rateCardResult.success
          ? rateCardResult.expectedSettlementAmount
          : order.expectedSettlementAmount;

        const settlementResult = reconcileSettlement({
          expectedAmount,
          actualAmount: hasSettlements ? actualAmount : null,
          dueDate: order.settlementDueAt,
        });

        // ---------------- FREIGHT RECONCILIATION ----------------

        const freightResults = await Promise.all(
          order.freightCharges.map((charge) =>
            reconcileFreight({
              partnerId: order.partnerId,
              channel: order.channel,
              courierName: charge.courierName,
              chargedAmount: charge.chargedAmount,
              actualWeight: charge.actualWeight,
              orderDate: order.orderDate,
            })
          )
        );

        const hasFreightCharges = order.freightCharges.length > 0;

        const allFreightRatesFound =
          hasFreightCharges &&
          freightResults.every(
            (item) => item.expectedFreight !== null
          );

        const actualFreight = order.freightCharges.reduce(
          (total, charge) =>
            total.plus(toMoney(charge.chargedAmount)),
          toMoney(0)
        );

        const expectedFreight = allFreightRatesFound
          ? freightResults.reduce(
              (total, item) =>
                total.plus(toMoney(item.expectedFreight)),
              toMoney(0)
            )
          : null;

        const freightDifference = allFreightRatesFound
          ? actualFreight.minus(expectedFreight)
          : null;

        let freightStatus = null;

        if (hasFreightCharges) {
          if (!allFreightRatesFound) {
            freightStatus = "REVIEW_REQUIRED";
          } else if (freightDifference.greaterThan(FREIGHT_THRESHOLD)) {
            freightStatus = "FREIGHT_OVERCHARGED";
          } else {
            freightStatus = "SETTLED";
          }
        }

        const freightReviewReasons = freightResults
          .filter((item) => item.reviewReason)
          .map((item) => item.reviewReason);

        const reviewReasons = [
          settlementResult.reviewReason,
          ...freightReviewReasons,
        ].filter(Boolean);

        return {
          order,
          settlementResult,
          settlements: selectedSettlements,
          actualAmount: hasSettlements
            ? formatMoney(actualAmount)
            : null,
          freightStatus,
          expectedFreightAmount:
            allFreightRatesFound
              ? formatMoney(expectedFreight)
              : null,
          actualFreightAmount: hasFreightCharges
            ? formatMoney(actualFreight)
            : null,
          freightDifference:
            allFreightRatesFound
              ? formatMoney(freightDifference)
              : null,
          reviewReason:
            reviewReasons.length > 0
              ? reviewReasons.join(" ")
              : null,
        };
      })
    );

    // 4. Save settlement matches, freight results and settlement links atomically.
    await prisma.$transaction(async (tx) => {
      for (const item of results) {
        const match = await tx.reconciliationMatch.create({
          data: {
            runId: run.id,
            orderId: item.order.id,

            // Settlement results remain independent.
            status: item.settlementResult.status,
            expectedAmount: item.settlementResult.expectedAmount,
            actualAmount: item.actualAmount,
            difference: item.settlementResult.difference,

            // Freight results are stored separately.
            freightStatus: item.freightStatus,
            expectedFreightAmount: item.expectedFreightAmount,
            actualFreightAmount: item.actualFreightAmount,
            freightDifference: item.freightDifference,

            reviewReason: item.reviewReason,
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
      results: results.map((item) => ({
        orderNumber: item.order.orderNumber,

        settlement: item.settlementResult,

        freight: {
          status: item.freightStatus,
          expectedAmount: item.expectedFreightAmount,
          actualAmount: item.actualFreightAmount,
          difference: item.freightDifference,
        },

        reviewReason: item.reviewReason,
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

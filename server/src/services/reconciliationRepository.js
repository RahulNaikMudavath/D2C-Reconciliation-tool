import prisma from "../config/database.js";
import { reconcileSettlement } from "./reconciliationService.js";
import { toMoney, formatMoney } from "../utils/money.js";
import { randomUUID } from "node:crypto";

const FREIGHT_THRESHOLD = toMoney(10);
const RETURN_SLA_DAYS = 7;
const ORDER_BATCH_SIZE = 2500;

function matchChannelRateCard(cards, partnerId, channel, orderDate) {
  const targetTime = orderDate ? new Date(orderDate).getTime() : Date.now();
  return cards.find((card) => {
    if (card.partnerId !== partnerId || card.channel !== channel) return false;
    const fromTime = new Date(card.effectiveFrom).getTime();
    if (fromTime > targetTime) return false;
    if (card.effectiveTo) {
      const toTime = new Date(card.effectiveTo).getTime();
      if (toTime < targetTime) return false;
    }
    return true;
  });
}

function calculateFastExpectedSettlement(rateCard, orderValue) {
  if (!rateCard) {
    return { success: false, expectedSettlementAmount: null };
  }
  const value = toMoney(orderValue);
  const commission = value.mul(toMoney(rateCard.commissionPercent)).div(100);
  const expected = value
    .minus(commission)
    .minus(toMoney(rateCard.fixedFee))
    .minus(toMoney(rateCard.otherFee));

  return {
    success: true,
    expectedSettlementAmount: formatMoney(expected),
  };
}

function matchCourierRateCard(cards, partnerId, channel, courierName, weightKg, orderDate) {
  const targetTime = orderDate ? new Date(orderDate).getTime() : Date.now();
  const weight = Number(weightKg || 0);

  return cards.find((card) => {
    if (card.partnerId !== partnerId || card.channel !== channel || card.courierName !== courierName) {
      return false;
    }
    const fromTime = new Date(card.effectiveFrom).getTime();
    if (fromTime > targetTime) return false;
    if (card.effectiveTo) {
      const toTime = new Date(card.effectiveTo).getTime();
      if (toTime < targetTime) return false;
    }
    if (card.minWeightKg !== null && weight < Number(card.minWeightKg)) return false;
    if (card.maxWeightKg !== null && weight > Number(card.maxWeightKg)) return false;
    return true;
  });
}

function calculateFastExpectedFreight(rateCard, weightKg, chargedAmount) {
  if (!rateCard) {
    return {
      status: "REVIEW_REQUIRED",
      expectedFreight: null,
      actualFreight: formatMoney(toMoney(chargedAmount)),
      difference: null,
      reviewReason: "No applicable courier rate card found.",
    };
  }

  const weight = toMoney(weightKg || 0);
  const expected = toMoney(rateCard.baseCharge).plus(
    weight.mul(toMoney(rateCard.perKgCharge))
  );
  const actual = toMoney(chargedAmount);
  const difference = actual.minus(expected);
  const isOvercharged = difference.greaterThan(FREIGHT_THRESHOLD);

  return {
    status: isOvercharged ? "FREIGHT_OVERCHARGED" : "SETTLED",
    expectedFreight: formatMoney(expected),
    actualFreight: formatMoney(actual),
    difference: formatMoney(difference),
    reviewReason: isOvercharged
      ? "Courier charged more than the applicable rate card."
      : null,
  };
}

export async function runReconciliation() {
  const totalOrdersCount = await prisma.order.count({
    where: {
      NOT: {
        orderNumber: { startsWith: "TEST-" },
      },
    },
  });

  if (totalOrdersCount === 0) {
    throw new Error("No orders found for reconciliation.");
  }

  const [channelRateCards, courierRateCards] = await Promise.all([
    prisma.channelRateCard.findMany({
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.rateCard.findMany({
      orderBy: { effectiveFrom: "desc" },
    }),
  ]);

  const run = await prisma.reconciliationRun.create({
    data: {
      status: "PROCESSING",
    },
  });

  const statusCounts = {
    TOTAL: totalOrdersCount,
    SETTLED: 0,
    SHORT_PAID: 0,
    UNPAID_PAST_DUE: 0,
    FREIGHT_OVERCHARGED: 0,
    RETURN_NOT_RECEIVED: 0,
    REVIEW_REQUIRED: 0,
  };

  const sampleResults = [];

  try {
    for (let skip = 0; skip < totalOrdersCount; skip += ORDER_BATCH_SIZE) {
      const orders = await prisma.order.findMany({
        where: {
          NOT: {
            orderNumber: { startsWith: "TEST-" },
          },
        },
        include: {
          partner: true,
          settlements: true,
          freightCharges: true,
          returns: true,
        },
        orderBy: {
          id: "asc",
        },
        skip,
        take: ORDER_BATCH_SIZE,
      });

      const batchMatches = [];
      const batchSettlementLinks = [];

      for (const order of orders) {
        const importedSettlements = order.settlements.filter(
          (s) => s.importBatchId !== null
        );
        const selectedSettlements =
          importedSettlements.length > 0
            ? importedSettlements
            : order.settlements;

        const actualAmount = selectedSettlements.reduce(
          (total, s) => total.plus(toMoney(s.amountReceived)),
          toMoney(0)
        );
        const hasSettlements = selectedSettlements.length > 0;

        const channelCard = order.partnerId
          ? matchChannelRateCard(
              channelRateCards,
              order.partnerId,
              order.channel,
              order.orderDate
            )
          : null;

        const rateCardResult = calculateFastExpectedSettlement(
          channelCard,
          order.orderValue
        );

        const expectedAmount = rateCardResult.success
          ? rateCardResult.expectedSettlementAmount
          : order.expectedSettlementAmount;

        const settlementResult = reconcileSettlement({
          expectedAmount,
          actualAmount: hasSettlements ? actualAmount : null,
          dueDate: order.settlementDueAt,
          hasSettlementRecord: hasSettlements,
        });

        // Return reconciliation
        const returnResults = order.returns.map((returnRecord) => {
          const normalizedStatus = String(returnRecord.status || "")
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, "_");

          let returnStatus = null;
          let returnReviewReason = null;

          if (returnRecord.warehouseReceivedAt) {
            returnStatus = "SETTLED";
          } else if (
            ["RECEIVED", "WAREHOUSE_RECEIVED", "COMPLETED"].includes(
              normalizedStatus
            )
          ) {
            returnStatus = "REVIEW_REQUIRED";
            returnReviewReason = `Return ${returnRecord.id} is marked received by courier but lacks warehouse scan.`;
          } else {
            const returnDate = returnRecord.returnDate
              ? new Date(returnRecord.returnDate)
              : null;
            const ageInDays =
              returnDate && !Number.isNaN(returnDate.getTime())
                ? Math.floor(
                    (Date.now() - returnDate.getTime()) / (1000 * 60 * 60 * 24)
                  )
                : 0;

            if (ageInDays > RETURN_SLA_DAYS) {
              returnStatus = "RETURN_NOT_RECEIVED";
              returnReviewReason = `Return ${returnRecord.id} was initiated ${ageInDays} days ago (exceeding ${RETURN_SLA_DAYS}-day SLA) but has not reached the warehouse.`;
            } else {
              returnStatus = "REVIEW_REQUIRED";
              returnReviewReason = `Return ${returnRecord.id} is in transit (${ageInDays}d elapsed within ${RETURN_SLA_DAYS}-day SLA) awaiting warehouse receipt.`;
            }
          }

          return {
            returnRecordId: returnRecord.id,
            returnStatus,
            returnReviewReason,
          };
        });

        const latestReturnResult =
          returnResults.length > 0
            ? returnResults[returnResults.length - 1]
            : null;
        const returnRecordId = latestReturnResult?.returnRecordId ?? null;
        const returnStatus =
          returnResults.length === 0
            ? null
            : returnResults.some(
                (item) => item.returnStatus === "RETURN_NOT_RECEIVED"
              )
            ? "RETURN_NOT_RECEIVED"
            : returnResults.every((item) => item.returnStatus === "SETTLED")
            ? "SETTLED"
            : "REVIEW_REQUIRED";

        const returnReviewReasons = returnResults
          .filter((item) => item.returnReviewReason)
          .map((item) => item.returnReviewReason);

        // Freight reconciliation
        const freightResults = order.freightCharges.map((charge) => {
          const card = matchCourierRateCard(
            courierRateCards,
            order.partnerId,
            order.channel,
            charge.courierName,
            charge.actualWeight,
            order.orderDate
          );
          return calculateFastExpectedFreight(
            card,
            charge.actualWeight,
            charge.chargedAmount
          );
        });

        const hasFreightCharges = order.freightCharges.length > 0;
        const allFreightRatesFound =
          hasFreightCharges &&
          freightResults.every((item) => item.expectedFreight !== null);

        const actualFreight = order.freightCharges.reduce(
          (total, charge) => total.plus(toMoney(charge.chargedAmount)),
          toMoney(0)
        );
        const expectedFreight = allFreightRatesFound
          ? freightResults.reduce(
              (total, item) => total.plus(toMoney(item.expectedFreight)),
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
          ...returnReviewReasons,
        ].filter(Boolean);

        const finalReviewReason =
          reviewReasons.length > 0 ? reviewReasons.join(" | ") : null;

        if (settlementResult.status === "SETTLED") statusCounts.SETTLED++;
        if (settlementResult.status === "SHORT_PAID") statusCounts.SHORT_PAID++;
        if (settlementResult.status === "UNPAID_PAST_DUE") statusCounts.UNPAID_PAST_DUE++;
        if (
          settlementResult.status === "REVIEW_REQUIRED" ||
          freightStatus === "REVIEW_REQUIRED" ||
          returnStatus === "REVIEW_REQUIRED"
        ) {
          statusCounts.REVIEW_REQUIRED++;
        }
        if (freightStatus === "FREIGHT_OVERCHARGED") statusCounts.FREIGHT_OVERCHARGED++;
        if (returnStatus === "RETURN_NOT_RECEIVED") statusCounts.RETURN_NOT_RECEIVED++;

        const matchId = randomUUID();
        batchMatches.push({
          id: matchId,
          runId: run.id,
          orderId: order.id,
          status: settlementResult.status,
          expectedAmount: settlementResult.expectedAmount,
          actualAmount: hasSettlements ? actualAmount : null,
          difference: settlementResult.difference,
          freightStatus,
          expectedFreightAmount: expectedFreight ? formatMoney(expectedFreight) : null,
          actualFreightAmount: hasFreightCharges ? formatMoney(actualFreight) : null,
          freightDifference: freightDifference ? formatMoney(freightDifference) : null,
          returnRecordId,
          returnStatus,
          reviewReason: finalReviewReason,
        });

        if (selectedSettlements.length > 0) {
          for (const s of selectedSettlements) {
            batchSettlementLinks.push({
              reconciliationMatchId: matchId,
              settlementId: s.id,
            });
          }
        }

        if (sampleResults.length < 1000) {
          sampleResults.push({
            orderNumber: order.orderNumber,
            channel: order.channel,
            partnerName: order.partner?.name ?? "Unknown",
            orderDate: order.orderDate,
            orderValue: order.orderValue?.toString(),
            weightKg: order.weightKg?.toString() ?? null,
            status: settlementResult.status,
            expectedAmount: settlementResult.expectedAmount,
            actualAmount: hasSettlements ? actualAmount.toString() : null,
            difference: settlementResult.difference,
            settlement: settlementResult,
            freightStatus,
            expectedFreightAmount: expectedFreight ? formatMoney(expectedFreight) : null,
            actualFreightAmount: hasFreightCharges ? formatMoney(actualFreight) : null,
            freightDifference: freightDifference ? formatMoney(freightDifference) : null,
            freight: {
              status: freightStatus,
              expectedAmount: expectedFreight ? formatMoney(expectedFreight) : null,
              actualAmount: hasFreightCharges ? formatMoney(actualFreight) : null,
              difference: freightDifference ? formatMoney(freightDifference) : null,
            },
            returnStatus,
            returnRecordId,
            return: {
              recordId: returnRecordId,
              status: returnStatus,
            },
            reviewReason: finalReviewReason,
          });
        }
      }

      await prisma.reconciliationMatch.createMany({
        data: batchMatches,
      });

      if (batchSettlementLinks.length > 0) {
        await prisma.matchSettlement.createMany({
          data: batchSettlementLinks,
        });
      }
    }

    await prisma.reconciliationRun.update({
      where: {
        id: run.id,
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return {
      runId: run.id,
      totalOrders: totalOrdersCount,
      statusCounts,
      results: sampleResults,
    };
  } catch (error) {
    await prisma.matchSettlement.deleteMany({
      where: {
        reconciliationMatch: {
          runId: run.id,
        },
      },
    }).catch(() => {});

    await prisma.reconciliationMatch.deleteMany({
      where: {
        runId: run.id,
      },
    }).catch(() => {});

    await prisma.reconciliationRun.update({
      where: {
        id: run.id,
      },
      data: {
        status: "FAILED",
        completedAt: new Date(),
      },
    }).catch(() => {});

    throw error;
  }
}

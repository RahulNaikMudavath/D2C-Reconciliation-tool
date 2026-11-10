import prisma from "../config/database.js";
import { reconcileSettlement } from "./reconciliationService.js";
import { toMoney, formatMoney } from "../utils/money.js";
import { randomUUID } from "node:crypto";

const FREIGHT_THRESHOLD = toMoney(10);
const RETURN_SLA_DAYS = 7; // Configurable business rule: in-transit returns exceeding 7 days without warehouse receipt are classified as lost/overdue.
const BULK_CHUNK_SIZE = 5000;

// High-speed in-memory rate card matchers
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
  // 1. Fetch all orders with relations (excluding ephemeral test orders).
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
      orderDate: "asc",
    },
  });

  if (orders.length === 0) {
    throw new Error("No orders found for reconciliation.");
  }

  // 2. Pre-fetch all rate cards ONCE to avoid N*2 SQL queries in loop
  const [channelRateCards, courierRateCards] = await Promise.all([
    prisma.channelRateCard.findMany({
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.rateCard.findMany({
      orderBy: { effectiveFrom: "desc" },
    }),
  ]);

  // 3. Start a new reconciliation run.
  const run = await prisma.reconciliationRun.create({
    data: {
      status: "PROCESSING",
    },
  });

  try {
    // 4. Calculate settlement, freight, and returns synchronously in memory.
    const results = orders.map((order) => {
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

      // ---------------- RETURN RECONCILIATION ----------------
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
          returnReviewReason =
            `Return ${returnRecord.id} is marked received by courier but lacks warehouse scan.`;
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
            returnReviewReason =
              `Return ${returnRecord.id} was initiated ${ageInDays} days ago (exceeding ${RETURN_SLA_DAYS}-day SLA) but has not reached the warehouse.`;
          } else {
            returnStatus = "REVIEW_REQUIRED";
            returnReviewReason =
              `Return ${returnRecord.id} is in transit (${ageInDays}d elapsed within ${RETURN_SLA_DAYS}-day SLA) awaiting warehouse receipt.`;
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

      const returnRecordId =
        latestReturnResult?.returnRecordId ?? null;

      const returnStatus =
        returnResults.length === 0
          ? null
          : returnResults.some(
              (item) => item.returnStatus === "RETURN_NOT_RECEIVED"
            )
          ? "RETURN_NOT_RECEIVED"
          : returnResults.every(
              (item) => item.returnStatus === "SETTLED"
            )
          ? "SETTLED"
          : "REVIEW_REQUIRED";

      const returnReviewReasons = returnResults
        .filter((item) => item.returnReviewReason)
        .map((item) => item.returnReviewReason);

      // ---------------- FREIGHT RECONCILIATION ----------------
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
        ...returnReviewReasons,
      ].filter(Boolean);

      return {
        order,
        settlementResult,
        settlements: selectedSettlements,
        returnRecordId,
        returnStatus,
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
    });

    // 5. High-speed bulk persistence using pre-generated UUIDs and createMany chunks
    const matchesToInsert = [];
    const settlementLinksToInsert = [];

    for (const item of results) {
      const matchId = randomUUID();

      matchesToInsert.push({
        id: matchId,
        runId: run.id,
        orderId: item.order.id,

        // Settlement results
        status: item.settlementResult.status,
        expectedAmount: item.settlementResult.expectedAmount,
        actualAmount: item.actualAmount,
        difference: item.settlementResult.difference,

        // Freight results
        freightStatus: item.freightStatus,
        expectedFreightAmount: item.expectedFreightAmount,
        actualFreightAmount: item.actualFreightAmount,
        freightDifference: item.freightDifference,

        // Return results
        returnRecordId: item.returnRecordId,
        returnStatus: item.returnStatus,

        reviewReason: item.reviewReason,
      });

      if (item.settlements.length > 0) {
        for (const settlement of item.settlements) {
          settlementLinksToInsert.push({
            reconciliationMatchId: matchId,
            settlementId: settlement.id,
          });
        }
      }
    }

    // Verify order IDs in matchesToInsert exist to prevent FK race conditions if orders are deleted concurrently
    const activeOrderIds = new Set(
      (await prisma.order.findMany({ select: { id: true } })).map((o) => o.id)
    );
    const validMatches = matchesToInsert.filter((m) => activeOrderIds.has(m.orderId));
    const validMatchIds = new Set(validMatches.map((m) => m.id));
    const validSettlementLinks = settlementLinksToInsert.filter((s) =>
      validMatchIds.has(s.reconciliationMatchId)
    );

    // Insert matches in 5,000-row bulk chunks
    for (let i = 0; i < validMatches.length; i += BULK_CHUNK_SIZE) {
      const chunk = validMatches.slice(i, i + BULK_CHUNK_SIZE);
      await prisma.reconciliationMatch.createMany({
        data: chunk,
      });
    }

    // Insert settlement links in 5,000-row bulk chunks
    for (let i = 0; i < validSettlementLinks.length; i += BULK_CHUNK_SIZE) {
      const chunk = validSettlementLinks.slice(i, i + BULK_CHUNK_SIZE);
      await prisma.matchSettlement.createMany({
        data: chunk,
      });
    }

    // Mark the run as completed
    await prisma.reconciliationRun.update({
      where: {
        id: run.id,
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    const statusCounts = {
      TOTAL: results.length,
      SETTLED: 0,
      SHORT_PAID: 0,
      UNPAID_PAST_DUE: 0,
      FREIGHT_OVERCHARGED: 0,
      RETURN_NOT_RECEIVED: 0,
      REVIEW_REQUIRED: 0,
    };

    for (const item of results) {
      if (item.settlementResult.status === "SETTLED") statusCounts.SETTLED++;
      if (item.settlementResult.status === "SHORT_PAID") statusCounts.SHORT_PAID++;
      if (item.settlementResult.status === "UNPAID_PAST_DUE") statusCounts.UNPAID_PAST_DUE++;
      if (
        item.settlementResult.status === "REVIEW_REQUIRED" ||
        item.freightStatus === "REVIEW_REQUIRED" ||
        item.returnStatus === "REVIEW_REQUIRED"
      ) {
        statusCounts.REVIEW_REQUIRED++;
      }
      if (item.freightStatus === "FREIGHT_OVERCHARGED") statusCounts.FREIGHT_OVERCHARGED++;
      if (item.returnStatus === "RETURN_NOT_RECEIVED") statusCounts.RETURN_NOT_RECEIVED++;
    }

    return {
      runId: run.id,
      totalOrders: results.length,
      statusCounts,
      results: results.slice(0, 1000).map((item) => ({
        orderNumber: item.order.orderNumber,
        channel: item.order.channel,
        partnerName: item.order.partner?.name ?? "Unknown",
        orderDate: item.order.orderDate,
        orderValue: item.order.orderValue?.toString(),
        weightKg: item.order.weightKg?.toString() ?? null,

        // Settlement
        status: item.settlementResult.status,
        expectedAmount: item.settlementResult.expectedAmount,
        actualAmount: item.actualAmount,
        difference: item.settlementResult.difference,
        settlement: item.settlementResult,

        // Freight
        freightStatus: item.freightStatus,
        expectedFreightAmount: item.expectedFreightAmount,
        actualFreightAmount: item.actualFreightAmount,
        freightDifference: item.freightDifference,
        freight: {
          status: item.freightStatus,
          expectedAmount: item.expectedFreightAmount,
          actualAmount: item.actualFreightAmount,
          difference: item.freightDifference,
        },

        // Return
        returnStatus: item.returnStatus,
        returnRecordId: item.returnRecordId,
        return: {
          recordId: item.returnRecordId,
          status: item.returnStatus,
        },

        reviewReason: item.reviewReason,
      })),
    };
  } catch (error) {
    // If saving fails, clean up any partial matches created in this run to keep database consistent
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

    // Record the failed run.
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

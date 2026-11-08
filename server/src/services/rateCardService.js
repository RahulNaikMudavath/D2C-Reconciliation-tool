import prisma from "../config/database.js";
import Decimal from "decimal.js";

// Find the applicable channel commission rate.
export async function calculateExpectedSettlement({
  partnerId,
  channel,
  orderValue,
  orderDate = new Date(),
}) {
  const rateCard = await prisma.channelRateCard.findFirst({
    where: {
      partnerId,
      channel,
      effectiveFrom: { lte: orderDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: orderDate } },
      ],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (!rateCard) {
    return {
      success: false,
      message: "No applicable channel rate card found.",
      expectedSettlementAmount: null,
    };
  }

  const value = new Decimal(orderValue);
  const commission = value
    .mul(rateCard.commissionPercent)
    .div(100);

  const expected = value
    .minus(commission)
    .minus(rateCard.fixedFee)
    .minus(rateCard.otherFee);

  return {
    success: true,
    rateCardId: rateCard.id,
    orderValue: value.toFixed(2),
    commissionAmount: commission.toFixed(2),
    fixedFee: new Decimal(rateCard.fixedFee).toFixed(2),
    otherFee: new Decimal(rateCard.otherFee).toFixed(2),
    expectedSettlementAmount: expected.toFixed(2),
  };
}

// Calculate expected courier freight using the applicable weight slab.
export async function calculateExpectedFreight({
  partnerId,
  channel,
  courierName,
  weightKg,
  orderDate = new Date(),
}) {
  const weight = new Decimal(weightKg);

  const rateCards = await prisma.rateCard.findMany({
    where: {
      partnerId,
      channel,
      courierName,
      effectiveFrom: { lte: orderDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: orderDate } },
      ],
      minWeightKg: { lte: weight.toNumber() },
    },
    orderBy: { effectiveFrom: "desc" },
  });

  const rateCard = rateCards.find((card) => {
    return (
      card.maxWeightKg === null ||
      weight.lte(card.maxWeightKg)
    );
  });

  if (!rateCard) {
    return {
      success: false,
      message: "No applicable courier rate card found.",
      expectedFreight: null,
    };
  }

  const freight = new Decimal(rateCard.baseCharge).plus(
    weight.mul(rateCard.perKgCharge)
  );

  return {
    success: true,
    rateCardId: rateCard.id,
    courierName,
    weightKg: weight.toFixed(3),
    baseCharge: new Decimal(rateCard.baseCharge).toFixed(2),
    perKgCharge: new Decimal(rateCard.perKgCharge).toFixed(2),
    expectedFreight: freight.toFixed(2),
  };
}

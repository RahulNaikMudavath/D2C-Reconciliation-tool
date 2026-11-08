import Decimal from "decimal.js";
import { calculateExpectedFreight } from "./rateCardService.js";

const FREIGHT_THRESHOLD = new Decimal(10);

export async function reconcileFreight({
  partnerId,
  channel,
  courierName,
  chargedAmount,
  actualWeight,
  orderDate,
}) {
  const rateCardResult = await calculateExpectedFreight({
    partnerId,
    channel,
    courierName,
    weightKg: actualWeight,
    orderDate,
  });

  if (!rateCardResult.success) {
    return {
      status: "REVIEW_REQUIRED",
      expectedFreight: null,
      actualFreight: new Decimal(chargedAmount).toFixed(2),
      difference: null,
      requiresClaim: false,
      reviewReason: rateCardResult.message,
    };
  }

  const expected = new Decimal(rateCardResult.expectedFreight);
  const actual = new Decimal(chargedAmount);

  const difference = actual.minus(expected);

  const isOvercharged = difference.greaterThan(FREIGHT_THRESHOLD);

  return {
    status: isOvercharged ? "FREIGHT_OVERCHARGED" : "SETTLED",
    expectedFreight: expected.toFixed(2),
    actualFreight: actual.toFixed(2),
    difference: difference.toFixed(2),
    requiresClaim: isOvercharged,
    reviewReason: isOvercharged
      ? "Courier charged more than the applicable rate card."
      : null,
    rateCardId: rateCardResult.rateCardId,
  };
}

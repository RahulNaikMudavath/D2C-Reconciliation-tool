import {
  calculateDifference,
  formatMoney,
  toMoney,
} from "../utils/money.js";

/**
 * 3-Way Order Settlement Reconciliation Logic.
 *
 * Rules:
 * 1. If expected settlement amount is missing: REVIEW_REQUIRED.
 * 2. If NO settlement file has been imported for this order (hasSettlementRecord === false or actualAmount === null):
 *    - The order is classified as REVIEW_REQUIRED (Awaiting settlement file upload / pending remittance).
 *    - It is NEVER falsely categorized as UNPAID_PAST_DUE or financial leakage.
 * 3. If a settlement file HAS been imported:
 *    - If difference > 10 (underpaid):
 *      - If overdue: SHORT_PAID (confirmed financial loss, requires claim).
 *      - If within due window: REVIEW_REQUIRED (partial settlement pending final due date).
 *    - If actual received is 0 and overdue: UNPAID_PAST_DUE (confirmed non-payment).
 *    - If difference < -10: REVIEW_REQUIRED (overpaid / excess remittance).
 *    - If -10 <= difference <= 10: SETTLED (within ₹10 tolerance).
 */
export function reconcileSettlement({
  expectedAmount,
  actualAmount,
  dueDate,
  hasSettlementRecord = false,
  currentDate = new Date(),
}) {
  // 1. Missing expected amount requires manual rate-card / order review.
  if (
    expectedAmount === null ||
    expectedAmount === undefined ||
    String(expectedAmount).trim() === ""
  ) {
    return {
      status: "REVIEW_REQUIRED",
      expectedAmount: null,
      actualAmount:
        actualAmount === null || actualAmount === undefined
          ? null
          : formatMoney(actualAmount),
      difference: null,
      isOverdue: false,
      requiresClaim: false,
      reviewReason: "Expected settlement amount is missing.",
    };
  }

  const expected = toMoney(expectedAmount);
  const isOverdue =
    dueDate !== null &&
    dueDate !== undefined &&
    new Date(dueDate).getTime() < currentDate.getTime();

  // 2. Case: No settlement file has been uploaded for this order yet.
  // CRITICAL: Missing settlement files must NEVER be classified as confirmed loss.
  if (!hasSettlementRecord || actualAmount === null || actualAmount === undefined) {
    return {
      status: "REVIEW_REQUIRED",
      expectedAmount: formatMoney(expected),
      actualAmount: null,
      difference: formatMoney(expected),
      isOverdue,
      requiresClaim: false,
      reviewReason: isOverdue
        ? "Settlement remittance file not yet imported (payment due date elapsed)."
        : "Settlement remittance not yet due (awaiting partner file).",
    };
  }

  // 3. Case: Settlement remittance file HAS been imported.
  const actual = toMoney(actualAmount);
  const difference = calculateDifference(expected, actual);

  let status = "REVIEW_REQUIRED";
  let requiresClaim = false;
  let reviewReason = null;

  if (difference.greaterThan(10)) {
    if (actual.isZero() && isOverdue) {
      status = "UNPAID_PAST_DUE";
      requiresClaim = true;
      reviewReason = "Partner confirmed zero settlement remittance for overdue order.";
    } else if (isOverdue) {
      status = "SHORT_PAID";
      requiresClaim = true;
      reviewReason = `Settlement underpaid by INR ${formatMoney(difference)} (exceeds ₹10 tolerance).`;
    } else {
      status = "REVIEW_REQUIRED";
      requiresClaim = false;
      reviewReason = "Partial remittance received; order is still within the due window.";
    }
  } else if (difference.lessThan(-10)) {
    status = "REVIEW_REQUIRED";
    requiresClaim = false;
    reviewReason = "Received amount exceeds expected settlement amount.";
  } else {
    // Difference is within [-10, 10]
    status = "SETTLED";
    requiresClaim = false;
    reviewReason = null;
  }

  return {
    status,
    expectedAmount: formatMoney(expected),
    actualAmount: formatMoney(actual),
    difference: formatMoney(difference),
    isOverdue,
    requiresClaim,
    reviewReason,
  };
}

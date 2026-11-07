import {
  calculateDifference,
  formatMoney,
  toMoney,
} from "../utils/money.js";

export function reconcileSettlement({
  expectedAmount,
  actualAmount,
  dueDate,
  currentDate = new Date(),
}) {
  // 1. Missing expected amount requires manual review.
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

  const actual =
    actualAmount === null || actualAmount === undefined
      ? null
      : toMoney(actualAmount);

  const difference =
    actual === null
      ? expected
      : calculateDifference(expected, actual);

  const isOverdue =
    dueDate !== null &&
    dueDate !== undefined &&
    new Date(dueDate).getTime() < currentDate.getTime();

  let status = "REVIEW_REQUIRED";

  if (actual === null) {
    status = isOverdue
      ? "UNPAID_PAST_DUE"
      : "REVIEW_REQUIRED";
  } else if (difference.greaterThan(10)) {
    status = isOverdue
      ? "SHORT_PAID"
      : "REVIEW_REQUIRED";
  } else if (difference.lessThan(-10)) {
    status = "REVIEW_REQUIRED";
  } else {
    status = "SETTLED";
  }

  return {
    status,
    expectedAmount: formatMoney(expected),
    actualAmount: actual === null ? null : formatMoney(actual),
    difference: formatMoney(difference),
    isOverdue,
    requiresClaim:
      status === "SHORT_PAID" ||
      status === "UNPAID_PAST_DUE",
    reviewReason:
      status === "REVIEW_REQUIRED"
        ? actual === null
          ? "Settlement is not yet due."
          : difference.lessThan(-10)
            ? "Received amount exceeds expected settlement amount."
            : "Settlement requires manual review."
        : null,
  };
}
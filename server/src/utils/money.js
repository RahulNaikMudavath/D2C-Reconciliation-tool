
import Decimal from "decimal.js";

Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

export function toMoney(value) {
  return new Decimal(value ?? 0);
}

export function calculateDifference(expected, actual) {
  return toMoney(expected).minus(toMoney(actual));
}

export function exceedsThreshold(difference) {
  return toMoney(difference).abs().greaterThan(10);
}

export function formatMoney(value) {
  return toMoney(value).toFixed(2);
}

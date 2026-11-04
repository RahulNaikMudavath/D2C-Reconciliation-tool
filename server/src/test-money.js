
import {
  calculateDifference,
  exceedsThreshold,
  formatMoney,
} from "./utils/money.js";

const expected = "1409.00";
const actual = "1372.00";

const difference = calculateDifference(expected, actual);

console.log("Expected:", expected);
console.log("Actual:", actual);
console.log("Difference:", formatMoney(difference));
console.log("Exceeds ₹10 threshold:", exceedsThreshold(difference));

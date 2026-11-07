
import { validateImportRecords } from "./imports/validators/importValidator.js";

const records = [
  {
    orderNumber: "RX-1001",
    settlementReference: "TXN-001",
    amount: "700",
  },
  {
    orderNumber: "RX-1001",
    settlementReference: "TXN-002",
    amount: "709",
  },
  {
    orderNumber: "RX-1002",
    settlementReference: "TXN-003",
    amount: "1200",
  },
  {
    orderNumber: "RX-1002",
    settlementReference: "TXN-003",
    amount: "1200",
  },
];

const result = validateImportRecords(records, {
  importType: "SETTLEMENTS",
  duplicateKey: "settlementReference",
});

console.log("VALID COUNT:", result.validCount);
console.log("REJECTED COUNT:", result.rejectedCount);
console.log("\nREJECTED RECORDS:");
console.log(result.rejectedRecords);

if (
  result.validCount !== 3 ||
  result.rejectedCount !== 1 ||
  result.rejectedRecords[0].errors[0] !==
    "Duplicate settlementReference."
) {
  throw new Error("Settlement validation test failed.");
}

console.log("\nSettlement validation test passed!");

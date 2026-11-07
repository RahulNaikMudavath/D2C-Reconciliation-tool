
import { validateImportRecords } from "./imports/validators/importValidator.js";

const sampleRecords = [
  {
    orderNumber: "RX-1001",
    amount: "1409",
    transactionDate: "2026-11-01",
  },
  {
    orderNumber: "RX-1002",
    amount: "1372",
    transactionDate: "2026-11-02",
  },
  {
    orderNumber: "",
    amount: "1200",
    transactionDate: "2026-11-03",
  },
  {
    orderNumber: "RX-1004",
    amount: "invalid",
    transactionDate: "2026-11-04",
  },
  {
    orderNumber: "RX-1001",
    amount: "1409",
    transactionDate: "2026-11-05",
  },
  {
    orderNumber: "RX-1006",
    amount: "500",
    transactionDate: "invalid-date",
  },
];

const result = validateImportRecords(sampleRecords);

console.log("TOTAL ROWS:", result.totalRows);
console.log("VALID ROWS:", result.validCount);
console.log("REJECTED ROWS:", result.rejectedCount);

console.log("\nVALID RECORDS:");
console.log(result.validRecords);

console.log("\nREJECTED RECORDS:");
console.dir(result.rejectedRecords, { depth: null });

if (
  result.totalRows !== 6 ||
  result.validCount !== 2 ||
  result.rejectedCount !== 4
) {
  throw new Error("Import validation test failed.");
}

console.log("\nImport validation test passed!");

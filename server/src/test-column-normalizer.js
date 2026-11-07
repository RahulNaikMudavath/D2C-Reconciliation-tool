
import { normalizeColumns } from "./imports/normalizers/columnNormalizer.js";

const amazonRecords = [
  {
    "Order ID": "RX-1001",
    "Settlement Reference": "TXN-001",
    "Settlement Amount": "700",
    "Transaction Date": "2026-11-01",
    "Payment Status": "Partial",
  },
  {
    "Order ID": "RX-1001",
    "Settlement Reference": "TXN-002",
    "Settlement Amount": "709",
    "Transaction Date": "2026-11-02",
    "Payment Status": "Settled",
  },
];

const result = normalizeColumns(amazonRecords);

console.log("COLUMN MAPPING:");
console.log(result.columnMapping);

console.log("\nNORMALIZED RECORDS:");
console.log(result.normalizedRecords);

console.log("\nUNMAPPED HEADERS:");
console.log(result.unmappedHeaders);

// Basic validation

// Basic validation
if (
  result.normalizedRecords.length !== 2 ||
  result.normalizedRecords[0].orderNumber !== "RX-1001" ||
  result.normalizedRecords[0].settlementReference !== "TXN-001" ||
  result.normalizedRecords[0].amount !== "700" ||
  result.normalizedRecords[1].orderNumber !== "RX-1001" ||
  result.normalizedRecords[1].settlementReference !== "TXN-002" ||
  result.normalizedRecords[1].amount !== "709" ||
  result.unmappedHeaders.length !== 0
) {
  throw new Error("Column normalization test failed.");
}

console.log("\nColumn normalization test passed!");

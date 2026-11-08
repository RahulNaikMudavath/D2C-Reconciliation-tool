import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseUploadedFile } from "./imports/parsers/fileParser.js";
import {
  normalizeColumns,
  normalizeColumnsWithApprovedMapping,
} from "./imports/normalizers/columnNormalizer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(
  __dirname,
  "../sample-data/amazon-settlements.csv"
);

// TEST 1: Existing CSV parser + normalizer
const records = await parseUploadedFile(filePath);

console.log("TEST 1: CSV PARSER + NORMALIZER");

const result = normalizeColumns(records);

console.log("COLUMN MAPPING:", result.columnMapping);
console.log("NORMALIZED RECORD:", result.normalizedRecords[0]);

if (!result.columnMapping.settlementReference) {
  throw new Error("Settlement reference mapping is missing!");
}

console.log("TEST 1 PASSED!");

// TEST 2: Approved AI mapping normalizer
console.log("\nTEST 2: APPROVED AI MAPPING");

const testRecords = [
  {
    "Order ID": "RX-1001",
    "Settlement Reference": "TXN-1001",
    "Settlement Amount": "1409",
    "Transaction Date": "2026-11-08",
    "Payment Status": "SUCCESS",
  },
];

const approvedMapping = {
  orderNumber: "Order ID",
  settlementReference: "Settlement Reference",
  amount: "Settlement Amount",
  transactionDate: "Transaction Date",
  status: "Payment Status",
};

const approvedResult = normalizeColumnsWithApprovedMapping(
  testRecords,
  approvedMapping
);

console.log("APPROVED MAPPING:", approvedResult.columnMapping);
console.log("NORMALIZED RECORD:", approvedResult.normalizedRecords[0]);

if (
  approvedResult.normalizedRecords[0].orderNumber !== "RX-1001" ||
  approvedResult.normalizedRecords[0].amount !== "1409" ||
  approvedResult.normalizedRecords[0].settlementReference !== "TXN-1001"
) {
  throw new Error("Approved AI mapping normalization failed!");
}

console.log("TEST 2 PASSED!");

console.log("\nALL COLUMN NORMALIZER TESTS PASSED!");

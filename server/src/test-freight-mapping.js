import { suggestColumnMappings } from "./services/aiMappingService.js";

const freightHeaders = [
  "Order ID",
  "Courier Name",
  "Freight Charge",
  "Actual Weight",
  "Invoice Number",
  "Invoice Date",
];

const settlementHeaders = [
  "Order ID",
  "Settlement Reference",
  "Settlement Amount",
  "Transaction Date",
];

async function runTests() {
  console.log("\nTEST 1: FREIGHT COLUMN MAPPING");

  const freightResult = await suggestColumnMappings(
    freightHeaders,
    "FREIGHT"
  );

  console.log(JSON.stringify(freightResult, null, 2));

  console.log("\nTEST 2: SETTLEMENT COLUMN MAPPING");

  const settlementResult = await suggestColumnMappings(
    settlementHeaders,
    "SETTLEMENTS"
  );

  console.log(JSON.stringify(settlementResult, null, 2));
}

runTests().catch(console.error);

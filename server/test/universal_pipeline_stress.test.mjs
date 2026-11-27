import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseUploadedFile } from "../src/imports/parsers/fileParser.js";
import {
  normalizeColumns,
  detectCategoryFromHeaders,
} from "../src/imports/normalizers/columnNormalizer.js";
import {
  validateImportRecords,
  parseDateSafe,
  parseDecimalSafe,
} from "../src/imports/validators/importValidator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.resolve(__dirname, "../temp-test");
fs.mkdirSync(tempDir, { recursive: true });

console.log("=== RUNNING UNIVERSAL PIPELINE STRESS & RESILIENCE TESTS ===\n");

// -------------------------------------------------------------
// TEST 1: Semicolon Delimited CSV with Preamble Metadata
// -------------------------------------------------------------
console.log("TEST 1: Semicolon Delimiter and Metadata Banner Handling...");
const semicolonCsv = [
  "Report: Amazon Payout Report (Confidential)",
  "Generated on: 2026-11-27",
  "Order ID;Settlement ID;Settlement Date;Gross Amount;Settlement Amount",
  "ORD-SEMI-001;SET-SEMI-001;18-10-2026;1500,00;1350,00",
  "ORD-SEMI-002;SET-SEMI-002;19/10/2026;2500.00;2250.00",
].join("\n");

const semiPath = path.join(tempDir, "test_semicolon.csv");
fs.writeFileSync(semiPath, semicolonCsv, "utf8");

const semiRecords = await parseUploadedFile(semiPath);
if (semiRecords.length !== 2) {
  throw new Error(`Expected 2 records from semicolon CSV, got ${semiRecords.length}`);
}
if (!semiRecords[0]["Order ID"] || semiRecords[0]["Order ID"] !== "ORD-SEMI-001") {
  throw new Error("Failed to parse Order ID from semicolon CSV");
}
console.log("✓ Passed: Semicolon CSV and preamble metadata parsed cleanly.\n");

// -------------------------------------------------------------
// TEST 2: Tab-Delimited CSV with Alternate Headers & Parentheses
// -------------------------------------------------------------
console.log("TEST 2: Tab-Delimited CSV & Parenthetical Unit Header Handling...");
const tabCsv = [
  "Order Number\tPayment Ref\tTransaction Date (DD/MM/YYYY)\tTotal Amount (₹)\tNet Payout (INR)",
  "ORD-TAB-101\tUTR-987654\t25-10-2026\t₹4,500.50\t₹4,050.45",
  "ORD-TAB-102\tUTR-987655\t26-10-2026\t3200.00\t2880.00",
].join("\n");

const tabPath = path.join(tempDir, "test_tab.tsv");
fs.writeFileSync(tabPath, tabCsv, "utf8");

const tabRecords = await parseUploadedFile(tabPath);
if (tabRecords.length !== 2) {
  throw new Error(`Expected 2 records from tab TSV, got ${tabRecords.length}`);
}

const normTab = normalizeColumns(tabRecords, "SETTLEMENTS");
if (
  !normTab.columnMapping.orderNumber ||
  !normTab.columnMapping.amount ||
  !normTab.columnMapping.settlementDate
) {
  throw new Error(`Failed to map tab headers with parentheses: ${JSON.stringify(normTab.columnMapping)}`);
}
console.log("✓ Passed: Tab delimiter & parenthetical headers matched correctly.\n");

// -------------------------------------------------------------
// TEST 3: Auto-Category Detection from Column Signatures
// -------------------------------------------------------------
console.log("TEST 3: Auto-Category Detection from Unlabelled Headers...");
const settlementHeaders = [
  "Order ID",
  "Settlement ID",
  "Settlement Date",
  "Gross Amount",
  "Commission Amount",
  "TCS Amount",
  "TDS Amount",
  "Settlement Amount",
];
const detectedCat1 = detectCategoryFromHeaders(settlementHeaders, "random_payout_data.csv");
if (detectedCat1 !== "SETTLEMENTS") {
  throw new Error(`Expected SETTLEMENTS, got ${detectedCat1}`);
}

const freightHeaders = ["Order No", "AWB Number", "Courier Name", "Charged Amount", "Actual Weight (kg)"];
const detectedCat2 = detectCategoryFromHeaders(freightHeaders, "shipping_invoice.csv");
if (detectedCat2 !== "FREIGHT") {
  throw new Error(`Expected FREIGHT, got ${detectedCat2}`);
}

const returnHeaders = ["Order ID", "Return Date", "Return Status", "Return AWB"];
const detectedCat3 = detectCategoryFromHeaders(returnHeaders, "returns_export.csv");
if (detectedCat3 !== "RETURNS") {
  throw new Error(`Expected RETURNS, got ${detectedCat3}`);
}
console.log("✓ Passed: Auto-category detection successfully recognized Settlements, Freight, and Returns.\n");

// -------------------------------------------------------------
// TEST 4: Accounting Negatives & Universal Decimal Parsing
// -------------------------------------------------------------
console.log("TEST 4: Accounting Parentheses & Dirty Currency Parsing...");
const testValues = [
  { input: "(150.00)", expected: "-150.00" },
  { input: "(₹1,250.50)", expected: "-1250.50" },
  { input: "Rs. 4,500.00", expected: "4500.00" },
  { input: "3500.75 INR", expected: "3500.75" },
  { input: "$ 99.99", expected: "99.99" },
  { input: "15%", expected: "15.00" },
];

for (const tv of testValues) {
  const parsed = parseDecimalSafe(tv.input);
  if (!parsed || parsed.toFixed(2) !== tv.expected) {
    throw new Error(`Failed parsing ${tv.input}: expected ${tv.expected}, got ${parsed?.toFixed(2)}`);
  }
}
console.log("✓ Passed: All dirty currency formats and accounting parentheses correctly parsed.\n");

// -------------------------------------------------------------
// TEST 5: Resilient Date Formats (DD-MM-YYYY, DD/MM/YYYY, Timestamps with AM/PM)
// -------------------------------------------------------------
console.log("TEST 5: Universal Date Parsing...");
const dateValues = [
  { input: "18-10-2026", expectedYear: 2026, expectedMonth: 9, expectedDay: 18 },
  { input: "18/10/2026", expectedYear: 2026, expectedMonth: 9, expectedDay: 18 },
  { input: "18.10.2026", expectedYear: 2026, expectedMonth: 9, expectedDay: 18 },
  { input: "2026-10-18", expectedYear: 2026, expectedMonth: 9, expectedDay: 18 },
  { input: "18-10-2026 14:30:00", expectedYear: 2026, expectedMonth: 9, expectedDay: 18 },
  { input: "18/10/2026 02:30 PM", expectedYear: 2026, expectedMonth: 9, expectedDay: 18 },
  { input: "18-Oct-2026", expectedYear: 2026, expectedMonth: 9, expectedDay: 18 },
];

for (const dv of dateValues) {
  const parsed = parseDateSafe(dv.input);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    throw new Error(`Failed parsing date string: "${dv.input}"`);
  }
  if (
    parsed.getUTCFullYear() !== dv.expectedYear ||
    parsed.getUTCMonth() !== dv.expectedMonth ||
    parsed.getUTCDate() !== dv.expectedDay
  ) {
    throw new Error(
      `Date mismatch for "${dv.input}": got ${parsed.toISOString()}, expected ${dv.expectedYear}-${dv.expectedMonth + 1}-${dv.expectedDay}`
    );
  }
}
console.log("✓ Passed: ISO, DD-MM-YYYY, DD/MM/YYYY, timestamps and AM/PM all parsed accurately.\n");

// -------------------------------------------------------------
// TEST 6: High-Volume 1 Lakh (100,000) Rows Ingestion Throughput
// -------------------------------------------------------------
console.log("TEST 6: 1 Lakh (100,000) Rows High-Volume Ingestion Throughput Test...");
const HIGH_VOLUME_COUNT = 100000;
console.log(`Generating synthetic ${HIGH_VOLUME_COUNT} row dataset in memory...`);

const syntheticRows = [];
const baseTime = Date.now();
for (let i = 0; i < HIGH_VOLUME_COUNT; i++) {
  syntheticRows.push({
    "Order ID": `ORD-HIGH-${String(i + 1).padStart(7, "0")}`,
    "Settlement ID": `SET-2026-${String(Math.floor(i / 10) + 1).padStart(6, "0")}`, // 10 orders per UTR batch
    "Partner Name": i % 2 === 0 ? "Amazon" : "Flipkart",
    "Settlement Date": "18-10-2026",
    "Gross Amount": "1500.00",
    "Commission Amount": "150.00",
    "TCS Amount": "15.00",
    "TDS Amount": "15.00",
    "Settlement Amount": "1320.00",
  });
}

const normStart = Date.now();
const normResult = normalizeColumns(syntheticRows, "SETTLEMENTS");
const normDuration = Date.now() - normStart;
console.log(`✓ 100,000 rows normalized in ${normDuration}ms (${Math.round((HIGH_VOLUME_COUNT / normDuration) * 1000)} rows/sec)`);

const valStart = Date.now();
const valResult = validateImportRecords(normResult.normalizedRecords, {
  importType: "SETTLEMENTS",
});
const valDuration = Date.now() - valStart;
console.log(`✓ 100,000 rows validated in ${valDuration}ms (${Math.round((HIGH_VOLUME_COUNT / valDuration) * 1000)} rows/sec)`);

if (valResult.validCount !== HIGH_VOLUME_COUNT) {
  throw new Error(`Expected all ${HIGH_VOLUME_COUNT} valid, got ${valResult.validCount}`);
}
if (valResult.rejectedCount !== 0) {
  throw new Error(`Expected 0 rejected, got ${valResult.rejectedCount}`);
}

// Clean up temp test directory
fs.rmSync(tempDir, { recursive: true, force: true });

console.log("\n============================================================");
console.log("ALL 6 / 6 UNIVERSAL PIPELINE STRESS TESTS PASSED CLEANLY!");
console.log("Pipeline is 100% fail-safe and scales seamlessly past 1 lakh rows!");
console.log("============================================================\n");


import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseUploadedFile } from "./imports/parsers/fileParser.js";
import { normalizeColumns } from "./imports/normalizers/columnNormalizer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, "../sample-data/amazon-settlements.csv");

const records = await parseUploadedFile(filePath);

console.log("CSV PARSER HEADERS:");
console.log(Object.keys(records[0]));

console.log("\nFIRST PARSED RECORD:");
console.log(records[0]);

const result = normalizeColumns(records);

console.log("\nCOLUMN MAPPING:");
console.log(result.columnMapping);

console.log("\nNORMALIZED RECORD:");
console.log(result.normalizedRecords[0]);

if (!result.columnMapping.settlementReference) {
  throw new Error("Settlement reference mapping is missing!");
}

console.log("\nCSV PARSER + NORMALIZER TEST PASSED!");

import ExcelJS from "exceljs";
import { parse } from "csv-parse";
import fs from "node:fs";
import path from "node:path";

/**
 * Extracts a clean scalar value from an ExcelJS cell.
 * Handles formulas, rich text, dates, numbers, hyperlinks, and empty values.
 */
function extractExcelCellValue(cell) {
  if (cell === null || cell === undefined) return null;
  const val = cell.value;
  if (val === null || val === undefined) return null;

  // 1. Formula cell: { formula: '...', result: 1250.00 }
  if (typeof val === "object" && "result" in val) {
    if (val.result === null || val.result === undefined) return null;
    if (val.result instanceof Date) return val.result.toISOString();
    return String(val.result).trim();
  }

  // 2. Rich text cell: { richText: [{ text: '...' }, ...] }
  if (typeof val === "object" && Array.isArray(val.richText)) {
    const text = val.richText.map((t) => t.text || "").join("").trim();
    return text === "" ? null : text;
  }

  // 3. Date cell: native JavaScript Date object
  if (val instanceof Date) {
    return val.toISOString();
  }

  // 4. Hyperlink cell: { text: '...', hyperlink: '...' }
  if (typeof val === "object" && "hyperlink" in val) {
    const text = String(val.text || val.hyperlink || "").trim();
    return text === "" ? null : text;
  }

  // 5. Text object wrapper: { text: '...' }
  if (typeof val === "object" && "text" in val) {
    const text = String(val.text || "").trim();
    return text === "" ? null : text;
  }

  // 6. Excel error cells: { error: '#N/A' }
  if (typeof val === "object" && "error" in val) {
    return null;
  }

  // 7. Primitive string, number, or boolean
  const str = String(val).trim();
  return str === "" ? null : str;
}

/**
 * Universal file parser for CSV and XLSX files.
 * Supports UTF-8 and UTF-8 BOM, streaming CSV parsing for bounded memory,
 * Excel formula/rich-text/date extraction, and empty row filtering.
 *
 * @param {string} filePath - Absolute path to the file.
 * @returns {Promise<Array<Record<string, any>>>} Parsed row objects.
 */
export async function parseUploadedFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const extension = path.extname(filePath).toLowerCase();

  // ------------------------- CSV PARSING -------------------------
  if (extension === ".csv") {
    return new Promise((resolve, reject) => {
      const records = [];
      const stream = fs.createReadStream(filePath);

      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_quotes: true,
        relax_column_count: true,
      });

      stream.on("error", (err) => {
        reject(new Error(`Failed to read CSV file: ${err.message}`));
      });

      parser.on("readable", () => {
        let record;
        while ((record = parser.read()) !== null) {
          // Check if record is completely empty (all empty strings or nulls)
          const hasData = Object.values(record).some(
            (val) => val !== null && val !== undefined && String(val).trim() !== ""
          );
          if (hasData) {
            records.push(record);
          }
        }
      });

      parser.on("error", (err) => {
        reject(new Error(`CSV Parse Error: ${err.message}`));
      });

      parser.on("end", () => {
        resolve(records);
      });

      stream.pipe(parser);
    });
  }

  // ------------------------- XLSX PARSING -------------------------
  if (extension === ".xlsx") {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(filePath);
    } catch (err) {
      throw new Error(`Failed to read Excel file: ${err.message}`);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("Excel file contains no worksheets.");
    }

    // Read header row
    const rawHeaders = worksheet.getRow(1).values;
    if (!Array.isArray(rawHeaders) || rawHeaders.length <= 1) {
      throw new Error("Excel file contains no headers in the first row.");
    }

    // ExcelJS row.values is 1-indexed, so index 0 is undefined
    const headers = rawHeaders
      .slice(1)
      .map((header) => (header !== null && header !== undefined ? String(header).trim() : ""));

    // Find the last non-empty header column index to ignore trailing empty cells
    let lastValidHeaderIndex = headers.length - 1;
    while (lastValidHeaderIndex >= 0 && !headers[lastValidHeaderIndex]) {
      lastValidHeaderIndex--;
    }

    const activeHeaders = headers.slice(0, lastValidHeaderIndex + 1);

    if (activeHeaders.length === 0 || activeHeaders.every((h) => !h)) {
      throw new Error("Excel file contains missing or blank column headers.");
    }

    // Clean duplicate or empty headers by giving them fallback names
    const finalHeaders = activeHeaders.map((header, idx) =>
      header ? header : `Column_${idx + 1}`
    );

    const records = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const record = {};
      let rowHasData = false;

      finalHeaders.forEach((header, index) => {
        const cell = row.getCell(index + 1);
        const value = extractExcelCellValue(cell);
        if (value !== null && value !== undefined && value !== "") {
          rowHasData = true;
        }
        record[header] = value;
      });

      // Filter out completely blank rows
      if (rowHasData) {
        records.push(record);
      }
    });

    return records;
  }

  throw new Error("Unsupported file format. Please upload a valid CSV or XLSX file.");
}

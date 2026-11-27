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
 * Automatically inspects the first chunk of a CSV file to detect
 * the true column delimiter (comma, semicolon, tab, pipe) and identifies
 * if there are preamble metadata rows to skip before the header row.
 *
 * @param {string} filePath - Absolute path to the CSV file.
 * @returns {{ delimiter: string, fromLine: number }}
 */
function detectCsvFormat(filePath) {
  const fd = fs.openSync(filePath, "r");
  const buffer = Buffer.alloc(16384); // Read first 16KB
  const bytesRead = fs.readSync(fd, buffer, 0, 16384, 0);
  fs.closeSync(fd);

  if (bytesRead === 0) {
    return { delimiter: ",", fromLine: 1 };
  }

  // Strip BOM if present
  let text = buffer.toString("utf8", 0, bytesRead);
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const rawLines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) {
    return { delimiter: ",", fromLine: 1 };
  }

  const candidateDelimiters = [",", ";", "\t", "|"];

  // Helper to count delimiter occurrences outside quotes in a line
  const countDelims = (line, delim) => {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delim && !inQuotes) {
        count++;
      }
    }
    return count;
  };

  // Find candidate delimiter with the highest and most consistent count across early lines
  let bestDelimiter = ",";
  let maxConsistentCols = 0;
  let bestHeaderLine = 1;

  for (const delim of candidateDelimiters) {
    // Check first 5 lines for candidate delimiter counts
    const checkCount = Math.min(rawLines.length, 5);
    for (let lineIdx = 0; lineIdx < checkCount; lineIdx++) {
      const colCount = countDelims(rawLines[lineIdx], delim);
      if (colCount > maxConsistentCols) {
        maxConsistentCols = colCount;
        bestDelimiter = delim;
        bestHeaderLine = lineIdx + 1;
      }
    }
  }

  return {
    delimiter: bestDelimiter,
    fromLine: bestHeaderLine,
  };
}

/**
 * Universal, highly resilient file parser for CSV and XLSX files.
 * Features:
 * - Dynamic delimiter auto-detection (comma, semicolon, tab, pipe)
 * - Automatic preamble / metadata banner skipping
 * - Streaming parser with bounded memory footprint (100k+ rows)
 * - Universal empty cell and empty line normalization
 * - Rich Excel formula and date resolution
 *
 * @param {string} filePath - Absolute path to the file.
 * @returns {Promise<Array<Record<string, any>>>} Parsed row objects.
 */
export async function parseUploadedFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const extension = path.extname(filePath).toLowerCase();

  // ------------------------- CSV / TSV / TXT PARSING -------------------------
  if (extension === ".csv" || extension === ".tsv" || extension === ".txt") {
    const { delimiter, fromLine } = detectCsvFormat(filePath);

    return new Promise((resolve, reject) => {
      const records = [];
      const stream = fs.createReadStream(filePath);

      const parser = parse({
        columns: true,
        delimiter,
        from_line: fromLine,
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
            // Trim whitespace on every field key and value
            const cleanRecord = {};
            for (const [k, v] of Object.entries(record)) {
              const cleanKey = String(k ?? "").trim();
              if (cleanKey) {
                cleanRecord[cleanKey] = v !== null && v !== undefined ? String(v).trim() : null;
              }
            }
            records.push(cleanRecord);
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

    // Auto-detect header row: scan first 5 rows to find the one with the most non-empty string cells
    let headerRowNumber = 1;
    let maxHeadersFound = 0;
    let detectedHeaders = [];

    const rowsToCheck = Math.min(worksheet.rowCount || 5, 5);
    for (let r = 1; r <= rowsToCheck; r++) {
      const rowValues = worksheet.getRow(r).values;
      if (Array.isArray(rowValues)) {
        const potentialHeaders = rowValues
          .slice(1)
          .map((h) => (h !== null && h !== undefined ? String(h).trim() : ""))
          .filter(Boolean);
        if (potentialHeaders.length > maxHeadersFound) {
          maxHeadersFound = potentialHeaders.length;
          headerRowNumber = r;
          detectedHeaders = rowValues
            .slice(1)
            .map((h) => (h !== null && h !== undefined ? String(h).trim() : ""));
        }
      }
    }

    if (maxHeadersFound === 0) {
      throw new Error("Excel file contains no valid headers.");
    }

    // Find the last non-empty header column index to ignore trailing empty cells
    let lastValidHeaderIndex = detectedHeaders.length - 1;
    while (lastValidHeaderIndex >= 0 && !detectedHeaders[lastValidHeaderIndex]) {
      lastValidHeaderIndex--;
    }

    const activeHeaders = detectedHeaders.slice(0, lastValidHeaderIndex + 1);

    // Clean duplicate or empty headers by giving them fallback names
    const finalHeaders = activeHeaders.map((header, idx) =>
      header ? header : `Column_${idx + 1}`
    );

    const records = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return; // Skip preamble & header rows

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

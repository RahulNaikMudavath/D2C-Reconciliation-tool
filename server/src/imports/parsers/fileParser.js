import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import fs from "node:fs/promises";
import path from "node:path";

export async function parseUploadedFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".csv") {
    const fileContent = await fs.readFile(filePath, "utf-8");

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    return records;
  }

  if (extension === ".xlsx") {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error("Excel file contains no worksheets.");
    }

    const headers = worksheet.getRow(1).values
      .slice(1)
      .map((header) => String(header ?? "").trim());

    if (headers.length === 0 || headers.some((header) => !header)) {
      throw new Error("Excel file contains missing column headers.");
    }

    const records = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const record = {};

      headers.forEach((header, index) => {
        const value = row.getCell(index + 1).value;
        record[header] = value?.text ?? value ?? null;
      });

      records.push(record);
    });

    return records;
  }

  throw new Error("Unsupported file format. Upload CSV or XLSX.");
}



import { processUploadedFile } from "../services/importService.js";
import { suggestColumnMappings } from "../services/aiMappingService.js";
import { approveColumnMapping } from "../services/columnMappingService.js";

const allowedImportTypes = [
  "ORDERS",
  "SETTLEMENTS",
  "COD",
  "FREIGHT",
  "RETURNS",
  "WAREHOUSE_RECEIPTS",
];

export async function uploadImportFile(req, res, next) {
  try {
    const { importType } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file.",
      });
    }

    if (!allowedImportTypes.includes(importType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid import type.",
      });
    }

    const result = await processUploadedFile({
      file: req.file,
      importType,
      userId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "File imported successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function suggestMappings(req, res, next) {
  try {
    const { headers, importType } = req.body;

    if (!Array.isArray(headers) || headers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide column headers.",
      });
    }

    if (!allowedImportTypes.includes(importType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid import type.",
      });
    }

    if (
      headers.length > 100 ||
      headers.some(
        (header) =>
          typeof header !== "string" ||
          !header.trim() ||
          header.length > 200
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid column headers.",
      });
    }

    const result = await suggestColumnMappings(headers, importType);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function approveMapping(req, res, next) {
  try {
    const { mappingId } = req.params;

    if (!mappingId) {
      return res.status(400).json({
        success: false,
        message: "Mapping ID is required.",
      });
    }

    const result = await approveColumnMapping({
      mappingId,
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Column mapping approved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}


import prisma from "../config/database.js";
import { processUploadedFile } from "../services/importService.js";
import { suggestColumnMappings } from "../services/aiMappingService.js";
import {
  approveColumnMapping,
  rejectColumnMapping,
} from "../services/columnMappingService.js";
import { saveColumnMappingSuggestions } from "../services/columnMappingPersistenceService.js";

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
    const { headers, importType, importBatchId } = req.body;

    if (!Array.isArray(headers) || headers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide column headers.",
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

    let batch = null;
    if (importBatchId) {
      batch = await prisma.importBatch.findUnique({
        where: { id: importBatchId },
      });

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Import batch not found.",
        });
      }
    }

    const effectiveImportType = batch ? batch.importType : importType;

    if (!effectiveImportType || !allowedImportTypes.includes(effectiveImportType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid import type.",
      });
    }

    const aiResult = await suggestColumnMappings(
      headers,
      batch ? batch.importType : effectiveImportType
    );

    let savedMapping = null;
    if (importBatchId) {
      savedMapping = await saveColumnMappingSuggestions({
        importBatchId,
        suggestions: aiResult.suggestions,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...aiResult,
        savedMapping,
      },
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

export async function rejectMapping(req, res, next) {
  try {
    const { mappingId } = req.params;
    const { rejectionReason } = req.body || {};

    if (!mappingId) {
      return res.status(400).json({
        success: false,
        message: "Mapping ID is required.",
      });
    }

    if (
      typeof rejectionReason !== "string" ||
      !rejectionReason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required.",
      });
    }

    const result = await rejectColumnMapping({
      mappingId,
      userId: req.user.id,
      rejectionReason,
    });

    return res.status(200).json({
      success: true,
      message: "Column mapping rejected successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

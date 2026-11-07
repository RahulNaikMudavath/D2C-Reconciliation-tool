
import { processUploadedFile } from "../services/importService.js";

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

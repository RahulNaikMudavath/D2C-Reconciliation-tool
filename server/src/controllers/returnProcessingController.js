import { processReturnImport } from "../services/returnProcessingService.js";

export async function processReturnImportController(req, res) {
  try {
    const { importBatchId } = req.params;

    const result = await processReturnImport(importBatchId);

    return res.status(200).json({
      success: true,
      message: "Return import processing completed.",
      data: result,
    });
  } catch (error) {
    console.error("Return processing error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

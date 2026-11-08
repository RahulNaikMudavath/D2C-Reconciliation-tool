import { processFreightImport } from "../services/freightProcessingService.js";

export async function processFreightImportController(req, res) {
  try {
    const { importBatchId } = req.params;

    const result = await processFreightImport(importBatchId);

    return res.status(200).json({
      success: true,
      message: "Freight import processing completed.",
      data: result,
    });
  } catch (error) {
    console.error("Freight processing error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

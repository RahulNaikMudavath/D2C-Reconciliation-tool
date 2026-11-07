
import { processSettlementImport } from "../services/settlementProcessingService.js";

export async function processSettlementImportController(req, res, next) {
  try {
    const { importBatchId } = req.params;

    const result = await processSettlementImport(importBatchId);

    return res.status(200).json({
      success: true,
      message: "Settlement import processed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

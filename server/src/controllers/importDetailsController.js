import { getImportDetails } from "../services/importDetailsService.js";

export async function fetchImportDetails(req, res, next) {
  try {
    const { importBatchId } = req.params;

    const importDetails = await getImportDetails(importBatchId);

    return res.status(200).json({
      success: true,
      data: importDetails,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}
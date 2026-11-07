import { getImportHistory } from "../services/importHistoryService.js";

export async function fetchImportHistory(req, res, next) {
  try {
    const imports = await getImportHistory();

    return res.status(200).json({
      success: true,
      totalImports: imports.length,
      data: imports,
    });
  } catch (error) {
    next(error);
  }
}
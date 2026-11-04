import { runReconciliation } from "../services/reconciliationRepository.js";

export async function startReconciliation(req, res, next) {
  try {
    const result = await runReconciliation();

    return res.status(200).json({
      success: true,
      message: "Reconciliation completed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
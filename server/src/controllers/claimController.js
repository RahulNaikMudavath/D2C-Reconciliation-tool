
import { generateClaims } from "../services/claimService.js";

export async function createClaims(req, res, next) {
  try {
    const { runId } = req.body;

    if (!runId || typeof runId !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid reconciliation runId is required.",
      });
    }

    const result = await generateClaims(runId);

    return res.status(200).json({
      success: true,
      message: "Claim generation completed.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

import {
  generateClaims,
  getAllClaims,
  updateClaimStatus,
  assignClaimOwner,
  getPartnerClaimsSummary,
} from "../services/claimService.js";
import { updateClaimStatusSchema } from "../validators/claimValidator.js";
import { assignClaimSchema } from "../validators/assignClaimValidator.js";
import prisma from "../config/database.js";

export async function createClaims(req, res, next) {
  try {
    let runId = req.body?.runId;

    // Automatically find the latest completed run if no runId is supplied.
    if (!runId) {
      const latestRun = await prisma.reconciliationRun.findFirst({
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        select: { id: true },
      });

      if (!latestRun) {
        return res.status(400).json({
          success: false,
          message: "Please run reconciliation before generating claims.",
        });
      }

      runId = latestRun.id;
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

export async function fetchClaims(req, res, next) {
  try {
    const claims = await getAllClaims();

    return res.status(200).json({
      success: true,
      totalClaims: claims.length,
      data: claims,
    });
  } catch (error) {
    next(error);
  }
}

export async function changeClaimStatus(req, res, next) {
  try {
    const validation = updateClaimStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid claim status.",
        errors: validation.error.flatten(),
      });
    }

    const { claimId } = req.params;
    const { status } = validation.data;

    const updatedClaim = await updateClaimStatus(
      claimId,
      status,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: "Claim status updated successfully.",
      data: updatedClaim,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Claim not found.",
      });
    }

    next(error);
  }
}

export async function assignClaim(req, res, next) {
  try {
    const validation = assignClaimSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid owner ID.",
        errors: validation.error.flatten(),
      });
    }

    const { claimId } = req.params;
    const { ownerId } = validation.data;

    const updatedClaim = await assignClaimOwner(
      claimId,
      ownerId,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: "Claim assigned successfully.",
      data: updatedClaim,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Claim not found.",
      });
    }

    next(error);
  }
}

export async function fetchPartnerClaimsSummary(req, res, next) {
  try {
    const summary = await getPartnerClaimsSummary();

    return res.status(200).json({
      success: true,
      totalPartners: summary.length,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

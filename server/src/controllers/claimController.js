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

export async function exportClaimsCSV(req, res, next) {
  try {
    const { partnerId, status } = req.query;

    const where = {};
    if (partnerId) where.partnerId = partnerId;
    if (status && status !== "ALL") where.status = status;

    const claims = await prisma.claim.findMany({
      where,
      include: {
        partner: true,
        owner: {
          select: { name: true, email: true },
        },
        match: {
          include: {
            order: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Helper to escape CSV values
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      "Claim ID",
      "Partner Name",
      "Channel",
      "Order Number",
      "Order Date",
      "Order Value (INR)",
      "Claim Amount (INR)",
      "Status",
      "Age (Days)",
      "Assigned Owner",
      "Owner Email",
      "Discrepancy Components",
      "Evidence Summary",
      "Generated At",
    ];

    const rows = claims.map((claim) => {
      const evidence = claim.evidence ?? {};
      const components = Array.isArray(evidence.components)
        ? evidence.components
            .map(
              (c) =>
                `${c.type}: INR ${c.amount} (${c.description})`
            )
            .join(" | ")
        : "";

      const order = claim.match?.order;
      const orderDate = order?.orderDate
        ? new Date(order.orderDate).toISOString().split("T")[0]
        : "";
      const generatedAt = claim.createdAt
        ? new Date(claim.createdAt).toISOString()
        : "";

      const createdDate = new Date(claim.createdAt);
      const ageDays = Math.max(
        0,
        Math.floor(
          (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      return [
        escapeCsv(claim.id),
        escapeCsv(claim.partner?.name ?? "Unknown"),
        escapeCsv(order?.channel ?? ""),
        escapeCsv(order?.orderNumber ?? ""),
        escapeCsv(orderDate),
        escapeCsv(
          order?.orderValue ? Number(order.orderValue).toFixed(2) : ""
        ),
        escapeCsv(Number(claim.amount).toFixed(2)),
        escapeCsv(claim.status),
        escapeCsv(ageDays),
        escapeCsv(claim.owner?.name ?? "Unassigned"),
        escapeCsv(claim.owner?.email ?? ""),
        escapeCsv(components),
        escapeCsv(claim.match?.reviewReason ?? components),
        escapeCsv(generatedAt),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `ReconcileX_Claims_Evidence_${dateStr}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}

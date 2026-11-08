import prisma from "../config/database.js";
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";

export async function generateClaims(runId) {
  return prisma.$transaction(async (tx) => {
    // Find eligible reconciliation matches.
    const matches = await tx.reconciliationMatch.findMany({
      where: {
        runId,
        status: {
          in: ["SHORT_PAID", "UNPAID_PAST_DUE"],
        },
        claims: {
          none: {},
        },
      },
      include: {
        order: {
          include: {
            partner: true,
          },
        },
      },
    });

    const createdClaims = [];

    for (const match of matches) {
      // Prevent duplicate active claims for the same order.
      const existingActiveClaim = await tx.claim.findFirst({
        where: {
          status: {
            in: ["OPEN", "IN_REVIEW"],
          },
          match: {
            orderId: match.orderId,
          },
        },
      });

      if (existingActiveClaim) {
        continue;
      }
      if (!match.order.partner) {
        continue;
      }

      const claimNumber = `RX-CLM-${randomUUID()
        .replaceAll("-", "")
        .slice(0, 12)
        .toUpperCase()}`;

      const claim = await tx.claim.create({
        data: {
          claimNumber,
          description:
            `${match.status.replaceAll("_", " ")} for order ${match.order.orderNumber}`,
          amount: match.difference,
          status: "OPEN",
          partnerId: match.order.partner.id,
          matchId: match.id,
          evidence: {
            orderNumber: match.order.orderNumber,
            reconciliationRunId: runId,
            expectedAmount: match.expectedAmount.toString(),
            actualAmount: match.actualAmount?.toString() ?? null,
            difference: match.difference.toString(),
            status: match.status,
          },
        },
      });

      createdClaims.push(claim);
    }

    return {
      totalCreated: createdClaims.length,
      claims: createdClaims,
    };
  });
}

export async function getAllClaims() {
  return prisma.claim.findMany({
    include: {
      partner: true,
      owner: true,
      match: {
        include: {
          order: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function updateClaimStatus(claimId, status, userId) {
  return prisma.$transaction(async (tx) => {
    // Get the existing claim before updating it.
    const existingClaim = await tx.claim.findUnique({
      where: {
        id: claimId,
      },
    });

    if (!existingClaim) {
      const error = new Error("Claim not found.");
      error.statusCode = 404;
      throw error;
    }

    // Update the claim status.
    const updatedClaim = await tx.claim.update({
      where: {
        id: claimId,
      },
      data: {
        status,
      },
      include: {
        partner: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Record the status change in the audit log.
    await tx.auditLog.create({
      data: {
        action: "CLAIM_STATUS_UPDATED",
        entity: "Claim",
        entityId: claimId,
        userId,
        details: {
          claimNumber: existingClaim.claimNumber,
          previousStatus: existingClaim.status,
          newStatus: status,
        },
      },
    });

    return updatedClaim;
  });
}

export async function assignClaimOwner(claimId, ownerId, assignedByUserId) {
  return prisma.$transaction(async (tx) => {
    // Check whether the claim exists.
    const existingClaim = await tx.claim.findUnique({
      where: {
        id: claimId,
      },
    });

    if (!existingClaim) {
      const error = new Error("Claim not found.");
      error.statusCode = 404;
      throw error;
    }

    // Verify that the new owner exists.
    const user = await tx.user.findUnique({
      where: {
        id: ownerId,
      },
    });

    if (!user) {
      const error = new Error("Owner not found.");
      error.statusCode = 404;
      throw error;
    }

    // Only Finance Executives can own claims.
    if (user.role !== "FINANCE_EXECUTIVE") {
      const error = new Error(
        "Claims can only be assigned to Finance Executives."
      );
      error.statusCode = 400;
      throw error;
    }

    // Update the claim assignment.
    const updatedClaim = await tx.claim.update({
      where: {
        id: claimId,
      },
      data: {
        ownerId,
      },
      include: {
        partner: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Record the assignment in the audit log.
    await tx.auditLog.create({
      data: {
        action: "CLAIM_ASSIGNED",
        entity: "Claim",
        entityId: claimId,
        userId: assignedByUserId,
        details: {
          claimNumber: existingClaim.claimNumber,
          previousOwnerId: existingClaim.ownerId,
          newOwnerId: ownerId,
        },
      },
    });

    return updatedClaim;
  });
}

export async function getPartnerClaimsSummary() {
  const claims = await prisma.claim.findMany({
    include: {
      partner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const summary = new Map();

  for (const claim of claims) {
    if (!claim.partner) continue;

    const partnerId = claim.partner.id;

    if (!summary.has(partnerId)) {
      summary.set(partnerId, {
        partnerId,
        partnerName: claim.partner.name,
        totalClaims: 0,
        openClaims: 0,
        resolvedClaims: 0,
        totalClaimValue: new Decimal(0),
        openClaimValue: new Decimal(0),
        resolvedClaimValue: new Decimal(0),
      });
    }

    const item = summary.get(partnerId);
    const amount = new Decimal(claim.amount.toString());

    item.totalClaims += 1;
    item.totalClaimValue = item.totalClaimValue.plus(amount);

    if (["OPEN", "IN_REVIEW"].includes(claim.status)) {
      item.openClaims += 1;
      item.openClaimValue = item.openClaimValue.plus(amount);
    }

    if (claim.status === "RESOLVED") {
      item.resolvedClaims += 1;
      item.resolvedClaimValue = item.resolvedClaimValue.plus(amount);
    }
  }

  return Array.from(summary.values()).map((item) => ({
    ...item,
    totalClaimValue: item.totalClaimValue.toFixed(2),
    openClaimValue: item.openClaimValue.toFixed(2),
    resolvedClaimValue: item.resolvedClaimValue.toFixed(2),
  }));
}

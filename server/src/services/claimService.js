import prisma from "../config/database.js";
import { randomUUID } from "node:crypto";

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
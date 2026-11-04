
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

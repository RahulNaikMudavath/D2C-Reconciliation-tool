import prisma from "../config/database.js";
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";

export async function generateClaims(runId) {
  const matches = await prisma.reconciliationMatch.findMany({
    where: {
      runId,
      OR: [
        {
          status: {
            in: ["SHORT_PAID", "UNPAID_PAST_DUE"],
          },
        },
        {
          freightStatus: "FREIGHT_OVERCHARGED",
        },
      ],
    },
    include: {
      order: {
        include: {
          partner: true,
        },
      },
    },
  });

  // Pre-fetch all previous claims to eliminate N+1 DB round-trips
  const allPreviousClaims = await prisma.claim.findMany({
    select: {
      amount: true,
      evidence: true,
      match: {
        select: {
          orderId: true,
        },
      },
    },
  });

  const previousClaimsByOrderId = new Map();
  for (const pc of allPreviousClaims) {
    const orderId = pc.match?.orderId;
    if (!orderId) continue;
    if (!previousClaimsByOrderId.has(orderId)) {
      previousClaimsByOrderId.set(orderId, []);
    }
    previousClaimsByOrderId.get(orderId).push(pc);
  }

  const claimsToInsert = [];

  for (const match of matches) {
    if (!match.order.partner) {
      continue;
    }

    const previousClaims = previousClaimsByOrderId.get(match.orderId) || [];

    // Track amounts already claimed separately by component.
    const previouslyClaimed = {
      SETTLEMENT: new Decimal(0),
      FREIGHT: new Decimal(0),
    };

    for (const previousClaim of previousClaims) {
      const evidence = previousClaim.evidence ?? {};
      const oldComponents = Array.isArray(evidence.components)
        ? evidence.components
        : [];

      if (oldComponents.length > 0) {
        for (const component of oldComponents) {
          if (
            Object.hasOwn(previouslyClaimed, component.type) &&
            component.amount !== undefined
          ) {
            previouslyClaimed[component.type] =
              previouslyClaimed[component.type].plus(
                component.amount
              );
          }
        }
      } else {
        // Support older claims without a components array.
        const freightStatus =
          evidence.freight?.status ?? evidence.status;

        const settlementStatus =
          evidence.settlement?.status ?? evidence.status;

        if (freightStatus === "FREIGHT_OVERCHARGED") {
          previouslyClaimed.FREIGHT =
            previouslyClaimed.FREIGHT.plus(previousClaim.amount);
        } else if (
          ["SHORT_PAID", "UNPAID_PAST_DUE"].includes(settlementStatus)
        ) {
          previouslyClaimed.SETTLEMENT =
            previouslyClaimed.SETTLEMENT.plus(previousClaim.amount);
        }
      }
    }

    const candidateComponents = [];

    // Settlement recovery component.
    // RULE: Claims must only be generated for genuine, confirmed underpayments with imported remittance (actualAmount !== null).
    // Missing remittances (REVIEW_REQUIRED / pending settlements) are NOT eligible for financial recovery claims.
    const hasImportedSettlement = match.actualAmount !== null;
    const settlementEligible =
      (match.status === "SHORT_PAID" || match.status === "UNPAID_PAST_DUE") &&
      hasImportedSettlement &&
      match.reviewReason !== "Settlement remittance file not yet imported";

    if (settlementEligible && match.difference !== null) {
      const amount = new Decimal(match.difference.toString());

      // Respect the ₹10 financial discrepancy tolerance threshold
      if (amount.greaterThan(10)) {
        candidateComponents.push({
          type: "SETTLEMENT",
          amount,
          description: match.status.replaceAll("_", " "),
        });
      }
    }

    // Freight recovery component.
    // RULE: Only confirmed freight overcharges exceeding the ₹10 threshold are eligible.
    if (match.freightStatus === "FREIGHT_OVERCHARGED" && match.freightDifference !== null) {
      const amount = new Decimal(
        match.freightDifference.toString()
      );

      // Respect the ₹10 financial discrepancy tolerance threshold
      if (amount.greaterThan(10)) {
        candidateComponents.push({
          type: "FREIGHT",
          amount,
          description: "FREIGHT OVERCHARGED",
        });
      }
    }

    // Only claim the portion that has not already been claimed.
    const newComponents = [];

    for (const component of candidateComponents) {
      const previousAmount = previouslyClaimed[component.type];

      const remainingAmount = component.amount.minus(previousAmount);

      if (remainingAmount.greaterThan(0)) {
        newComponents.push({
          ...component,
          amount: remainingAmount,
        });
      }
    }

    if (newComponents.length === 0) {
      continue;
    }

    const totalClaimAmount = newComponents.reduce(
      (total, component) => total.plus(component.amount),
      new Decimal(0)
    );

    const claimNumber = `RX-CLM-${randomUUID()
      .replaceAll("-", "")
      .slice(0, 12)
      .toUpperCase()}`;

    claimsToInsert.push({
      id: randomUUID(),
      claimNumber,
      description:
        newComponents
          .map((component) => component.description)
          .join(" + ") +
        ` for order ${match.order.orderNumber}`,

      amount: totalClaimAmount.toFixed(2),
      status: "OPEN",
      partnerId: match.order.partner.id,
      matchId: match.id,

      evidence: {
        orderNumber: match.order.orderNumber,
        reconciliationRunId: runId,

        settlement: {
          status: match.status,
          expectedAmount:
            match.expectedAmount?.toString() ?? null,
            
          actualAmount:
            match.actualAmount?.toString() ?? null,
          difference:
            match.difference?.toString() ?? null,
        },

        freight: {
          status: match.freightStatus,
          expectedAmount:
            match.expectedFreightAmount?.toString() ?? null,
          actualAmount:
            match.actualFreightAmount?.toString() ?? null,
          difference:
            match.freightDifference?.toString() ?? null,
        },

        components: newComponents.map((component) => ({
          type: component.type,
          amount: component.amount.toFixed(2),
          description: component.description,
        })),

        totalClaimAmount: totalClaimAmount.toFixed(2),
      },
    });
  }

  // Bulk insert claims in chunks of 5,000 for ultra-high performance
  const BULK_CHUNK_SIZE = 5000;
  for (let i = 0; i < claimsToInsert.length; i += BULK_CHUNK_SIZE) {
    const chunk = claimsToInsert.slice(i, i + BULK_CHUNK_SIZE);
    await prisma.claim.createMany({
      data: chunk,
    });
  }

  return {
    totalCreated: claimsToInsert.length,
    claims: claimsToInsert.slice(0, 100),
  };
}

export async function getAllClaims() {
  return prisma.claim.findMany({
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

/**
 * Safely and auditably invalidates claims that were generated solely because
 * settlement remittance data was missing (e.g. before the false-leakage fix).
 *
 * Rules:
 * - Does NOT delete any claims.
 * - Does NOT mark genuine freight or confirmed underpayment claims as resolved.
 * - Preserves historical evidence and appends explicit invalidation audit metadata.
 * - Logs the batch invalidation in AuditLog.
 */
export async function invalidateFalseSettlementClaims({ userId = null, runId = null } = {}) {
  // 1. Get the latest completed reconciliation run if not specified
  let effectiveRun = null;
  if (runId) {
    effectiveRun = await prisma.reconciliationRun.findUnique({
      where: { id: runId },
    });
  } else {
    effectiveRun = await prisma.reconciliationRun.findFirst({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
    });
  }

  // 2. Identify false claims: claims in OPEN or IN_REVIEW state generated for orders
  // with NO imported settlements and marked UNPAID PAST DUE.
  const falseClaims = await prisma.claim.findMany({
    where: {
      status: { in: ["OPEN", "IN_REVIEW"] },
      description: { contains: "UNPAID PAST DUE" },
      match: {
        order: {
          settlements: { none: {} },
        },
      },
    },
    select: {
      id: true,
      amount: true,
    },
  });

  if (falseClaims.length === 0) {
    return {
      invalidatedCount: 0,
      invalidatedAmount: "0.00",
      message: "No false settlement claims found to invalidate.",
    };
  }

  let totalInvalidatedAmount = new Decimal(0);
  for (const c of falseClaims) {
    totalInvalidatedAmount = totalInvalidatedAmount.plus(c.amount?.toString() ?? "0");
  }

  // 3. Atomically update status to REJECTED and append invalidation evidence in PostgreSQL
  const invalidationReason =
    "Settlement remittance file not yet imported. Ineligible for financial recovery claim per reconciliation audit.";

  await prisma.$executeRawUnsafe(`
    UPDATE "Claim"
    SET "status" = 'REJECTED',
        "evidence" = jsonb_set(
          coalesce("evidence", '{}'::jsonb),
          '{invalidation}',
          jsonb_build_object(
            'invalidated', true,
            'invalidationReason', '${invalidationReason}',
            'invalidatedAt', NOW()::text,
            'previousStatus', "status"::text
          )
        ),
        "updatedAt" = NOW()
    WHERE "status" IN ('OPEN', 'IN_REVIEW')
      AND "description" LIKE '%UNPAID PAST DUE%'
      AND "matchId" IN (
        SELECT m."id" FROM "ReconciliationMatch" m
        JOIN "Order" o ON m."orderId" = o."id"
        LEFT JOIN "Settlement" s ON s."orderId" = o."id"
        WHERE s."id" IS NULL
      )
  `);

  // 4. Create an immutable AuditLog record for this batch action
  let auditUserId = userId;
  if (!auditUserId) {
    const defaultUser = await prisma.user.findFirst({
      where: { role: { in: ["FINANCE_EXECUTIVE", "CO_FOUNDER"] } },
    });
    auditUserId = defaultUser?.id;
  }

  if (auditUserId) {
    await prisma.auditLog.create({
      data: {
        action: "CLAIMS_AUTO_INVALIDATED",
        entity: "Claim",
        entityId: "BATCH_INVALIDATION",
        userId: auditUserId,
        details: {
          reason: invalidationReason,
          invalidatedCount: falseClaims.length,
          invalidatedAmount: totalInvalidatedAmount.toFixed(2),
          reconciliationRunId: effectiveRun?.id ?? null,
        },
      },
    });
  }

  return {
    success: true,
    invalidatedCount: falseClaims.length,
    invalidatedAmount: totalInvalidatedAmount.toFixed(2),
    reconciliationRunId: effectiveRun?.id ?? null,
  };
}

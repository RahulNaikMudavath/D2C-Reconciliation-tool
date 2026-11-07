import prisma from "../config/database.js";
import Decimal from "decimal.js";

export async function getDashboardSummary() {
  // Get the latest successfully completed reconciliation run.
  const latestRun = await prisma.reconciliationRun.findFirst({
    where: {
      status: "COMPLETED",
    },
    orderBy: {
      completedAt: "desc",
    },
    select: {
      id: true,
    },
  });

  // No completed reconciliation exists yet.
  if (!latestRun) {
    return {
      totalOrders: await prisma.order.count(),
      totalMatches: 0,
      totalExpected: "0.00",
      totalReceived: "0.00",
      moneyAtRisk: "0.00",
      openClaims: 0,
      totalClaimValue: "0.00",
      statusBreakdown: {},
      partnerLeakage: [],
    };
  }

  const [totalOrders, matches] = await Promise.all([
    prisma.order.count(),

    prisma.reconciliationMatch.findMany({
      where: {
        runId: latestRun.id,
      },
      select: {
        orderId: true,
        status: true,
        expectedAmount: true,
        actualAmount: true,
        difference: true,
        order: {
          select: {
            partner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const orderIds = matches.map((match) => match.orderId);

  const claims = await prisma.claim.findMany({
  where: {
    match: {
      orderId: {
        in: orderIds,
      },
      runId: latestRun.id,
      status: {
        in: ["SHORT_PAID", "UNPAID_PAST_DUE"],
      },
    },
  },
  select: {
    amount: true,
    status: true,   
  },
});

  const totalExpected = matches.reduce(
    (sum, match) => sum.plus(match.expectedAmount),
    new Decimal(0)
  );

  const totalReceived = matches.reduce(
    (sum, match) => sum.plus(match.actualAmount ?? 0),
    new Decimal(0)
  );

  const moneyAtRisk = matches
    .filter((match) =>
      ["SHORT_PAID", "UNPAID_PAST_DUE"].includes(match.status)
    )
    .reduce(
      (sum, match) => sum.plus(match.difference),
      new Decimal(0)
    );

  const openClaims = claims.filter((claim) =>
    ["OPEN", "IN_REVIEW"].includes(claim.status)
  );

  const totalClaimValue = openClaims.reduce(
    (sum, claim) => sum.plus(claim.amount),
    new Decimal(0)
  );

  const statusBreakdown = matches.reduce((result, match) => {
    result[match.status] = (result[match.status] || 0) + 1;
    return result;
  }, {});

  const partnerMap = new Map();

  for (const match of matches) {
    if (
      !["SHORT_PAID", "UNPAID_PAST_DUE"].includes(match.status)
    ) {
      continue;
    }

    const partner = match.order.partner;

    if (!partner) continue;

    const currentAmount =
      partnerMap.get(partner.id)?.amount || new Decimal(0);

    partnerMap.set(partner.id, {
      name: partner.name,
      amount: currentAmount.plus(match.difference),
    });
  }

  const partnerLeakage = Array.from(
    partnerMap,
    ([partnerId, data]) => ({
      partnerId,
      partnerName: data.name,
      amountAtRisk: data.amount.toFixed(2),
    })
  ).sort((a, b) =>
    new Decimal(b.amountAtRisk).comparedTo(a.amountAtRisk)
  );

  return {
    totalOrders,
    totalMatches: matches.length,
    totalExpected: totalExpected.toFixed(2),
    totalReceived: totalReceived.toFixed(2),
    moneyAtRisk: moneyAtRisk.toFixed(2),
    openClaims: openClaims.length,
    totalClaimValue: totalClaimValue.toFixed(2),
    statusBreakdown,
    partnerLeakage,
  };
}

import prisma from "../config/database.js";
import Decimal from "decimal.js";

export async function getDashboardSummary() {
  // 1. Get the latest completed reconciliation run.
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

  // 2. Return a safe empty dashboard when no run exists.
  if (!latestRun) {
    return {
      totalOrders: await prisma.order.count(),
      totalMatches: 0,
      totalExpected: "0.00",
      totalReceived: "0.00",
      totalExpectedFreight: "0.00",
      totalActualFreight: "0.00",
      settlementMoneyAtRisk: "0.00",
      freightMoneyAtRisk: "0.00",
      moneyAtRisk: "0.00",
      openClaims: 0,
      totalClaimValue: "0.00",
      statusBreakdown: {},
      freightStatusBreakdown: {},
      partnerLeakage: [],
    };
  }

  // 3. Fetch reconciliation matches and orders.
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
        freightStatus: true,
        expectedFreightAmount: true,
        actualFreightAmount: true,
        freightDifference: true,
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

  // 4. Fetch claims associated with eligible matches.
  const claims = await prisma.claim.findMany({
    where: {
      status: {
        in: ["OPEN", "IN_REVIEW"],
      },
    },
    select: {
      amount: true,
      status: true,
    },
  });

  // 5. Calculate settlement totals.
  const totalExpected = matches.reduce(
    (sum, match) =>
      sum.plus(match.expectedAmount ?? 0),
    new Decimal(0)
  );

  const totalReceived = matches.reduce(
    (sum, match) =>
      sum.plus(match.actualAmount ?? 0),
    new Decimal(0)
  );

  // 6. Calculate freight totals.
  const totalExpectedFreight = matches.reduce(
    (sum, match) =>
      sum.plus(match.expectedFreightAmount ?? 0),
    new Decimal(0)
  );

  const totalActualFreight = matches.reduce(
    (sum, match) =>
      sum.plus(match.actualFreightAmount ?? 0),
    new Decimal(0)
  );

  // 7. Calculate settlement money at risk.
  const settlementMoneyAtRisk = matches
    .filter((match) =>
      ["SHORT_PAID", "UNPAID_PAST_DUE"].includes(match.status)
    )
    .reduce(
      (sum, match) => {
        const difference = new Decimal(
          match.difference?.toString() ?? "0"
        );

        return sum.plus(
          Decimal.max(difference, 0)
        );
      },
      new Decimal(0)
    );

  // 8. Calculate confirmed freight overcharges.
  const freightMoneyAtRisk = matches
    .filter(
      (match) =>
        match.freightStatus === "FREIGHT_OVERCHARGED"
    )
    .reduce(
      (sum, match) => {
        const difference = new Decimal(
          match.freightDifference?.toString() ?? "0"
        );

        return sum.plus(
          Decimal.max(difference, 0)
        );
      },
      new Decimal(0)
    );

  // 9. Combined financial exposure.
  const moneyAtRisk = settlementMoneyAtRisk.plus(
    freightMoneyAtRisk
  );

  // 10. Open claims and their value.
  const openClaims = claims.filter((claim) =>
    ["OPEN", "IN_REVIEW"].includes(claim.status)
  );

  const totalClaimValue = openClaims.reduce(
    (sum, claim) =>
      sum.plus(claim.amount),
    new Decimal(0)
  );

  // 11. Settlement status breakdown.
  const statusBreakdown = matches.reduce(
    (result, match) => {
      result[match.status] =
        (result[match.status] || 0) + 1;

      return result;
    },
    {}
  );

  // 12. Freight status breakdown.
  const freightStatusBreakdown = matches.reduce(
    (result, match) => {
      if (match.freightStatus) {
        result[match.freightStatus] =
          (result[match.freightStatus] || 0) + 1;
      }

      return result;
    },
    {}
  );

  // 13. Partner-wise combined leakage.
  const partnerMap = new Map();

  for (const match of matches) {
    const partner = match.order.partner;

    if (!partner) continue;

    let settlementRisk = new Decimal(0);
    let freightRisk = new Decimal(0);

    if (
      ["SHORT_PAID", "UNPAID_PAST_DUE"].includes(
        match.status
      )
    ) {
      settlementRisk = Decimal.max(
        new Decimal(match.difference?.toString() ?? "0"),
        0
      );
    }

    if (match.freightStatus === "FREIGHT_OVERCHARGED") {
      freightRisk = Decimal.max(
        new Decimal(
          match.freightDifference?.toString() ?? "0"
        ),
        0
      );
    }

    const existing = partnerMap.get(partner.id) || {
      name: partner.name,
      settlementRisk: new Decimal(0),
      freightRisk: new Decimal(0),
    };

    existing.settlementRisk =
      existing.settlementRisk.plus(settlementRisk);

    existing.freightRisk =
      existing.freightRisk.plus(freightRisk);

    partnerMap.set(partner.id, existing);
  }

  const partnerLeakage = Array.from(
    partnerMap,
    ([partnerId, data]) => {
      const totalRisk = data.settlementRisk.plus(
        data.freightRisk
      );

      return {
        partnerId,
        partnerName: data.name,
        settlementRisk: data.settlementRisk.toFixed(2),
        freightRisk: data.freightRisk.toFixed(2),
        amountAtRisk: totalRisk.toFixed(2),
      };
    }
  ).sort((a, b) =>
    new Decimal(b.amountAtRisk).comparedTo(
      a.amountAtRisk
    )
  );

  // 14. Return dashboard summary.
  return {
    totalOrders,
    totalMatches: matches.length,

    totalExpected: totalExpected.toFixed(2),
    totalReceived: totalReceived.toFixed(2),

    totalExpectedFreight:
      totalExpectedFreight.toFixed(2),

    totalActualFreight:
      totalActualFreight.toFixed(2),

    settlementMoneyAtRisk:
      settlementMoneyAtRisk.toFixed(2),

    freightMoneyAtRisk:
      freightMoneyAtRisk.toFixed(2),

    moneyAtRisk: moneyAtRisk.toFixed(2),

    openClaims: openClaims.length,
    totalClaimValue: totalClaimValue.toFixed(2),

    statusBreakdown,
    freightStatusBreakdown,
    partnerLeakage,
  };
}

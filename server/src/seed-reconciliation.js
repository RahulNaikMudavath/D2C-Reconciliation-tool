
import prisma from "./config/database.js";

const daysFromNow = (days) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const sampleOrders = [
  {
    orderNumber: "RX-1001",
    channel: "AMAZON",
    partnerName: "Amazon",
    orderValue: "1500.00",
    expectedSettlementAmount: "1409.00",
    settlementDueAt: daysFromNow(-2),
    settlements: ["1409.00"],
  },
  {
    orderNumber: "RX-1002",
    channel: "FLIPKART",
    partnerName: "Flipkart",
    orderValue: "1500.00",
    expectedSettlementAmount: "1409.00",
    settlementDueAt: daysFromNow(-5),
    settlements: ["800.00", "572.00"],
  },
  {
    orderNumber: "RX-1003",
    channel: "WEBSITE",
    partnerName: "D2C Website",
    orderValue: "1200.00",
    expectedSettlementAmount: "1200.00",
    settlementDueAt: daysFromNow(-4),
    settlements: [],
  },
  {
    orderNumber: "RX-1004",
    channel: "AMAZON",
    partnerName: "Amazon",
    orderValue: "1100.00",
    expectedSettlementAmount: "999.00",
    settlementDueAt: daysFromNow(5),
    settlements: ["950.00"],
  },
  {
    orderNumber: "RX-1005",
    channel: "FLIPKART",
    partnerName: "Flipkart",
    orderValue: "1600.00",
    expectedSettlementAmount: "1500.00",
    settlementDueAt: daysFromNow(-3),
    settlements: ["1541.00"],
  },
];

async function seedReconciliationData() {
  for (const item of sampleOrders) {
    const partner = await prisma.partner.findFirst({
      where: { name: item.partnerName },
    });

    if (!partner) {
      throw new Error(`Partner not found: ${item.partnerName}`);
    }

    await prisma.order.upsert({
      where: { orderNumber: item.orderNumber },
      update: {
        partnerId: partner.id,
      },
      create: {
        orderNumber: item.orderNumber,
        channel: item.channel,
        partnerId: partner.id,
        orderDate: daysFromNow(-15),
        paymentMode: "PREPAID",
        deliveryStatus: "DELIVERED",
        orderValue: item.orderValue,
        expectedSettlementAmount:
          item.expectedSettlementAmount,
        settlementDueAt: item.settlementDueAt,
        weightKg: "1.500",
        settlements: {
          create: item.settlements.map((amount, index) => ({
            amountReceived: amount,
            grossAmount: amount,
            settlementDate: daysFromNow(-index - 1),
            referenceNumber:
              `${item.orderNumber}-PAY-${index + 1}`,
          })),
        },
      },
    });

    console.log(
      `Processed ${item.orderNumber} → ${partner.name}`
    );
  }

  console.log("\nOrder-partner associations completed!");
}

try {
  await seedReconciliationData();
} catch (error) {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

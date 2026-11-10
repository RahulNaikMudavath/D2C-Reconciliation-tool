import prisma from "./config/database.js";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  console.log("=== SEEDING RECONCILEX DATABASE ===");

  // 1. Seed Partners
  const partnersData = [
    { name: "Amazon", type: "MARKETPLACE" },
    { name: "Flipkart", type: "MARKETPLACE" },
    { name: "Shopify", type: "DIRECT_CHANNEL" },
    { name: "D2C Website", type: "DIRECT_CHANNEL" },
  ];

  const partnerMap = new Map();
  for (const p of partnersData) {
    let partner = await prisma.partner.findFirst({
      where: { name: p.name },
    });
    if (!partner) {
      partner = await prisma.partner.create({ data: p });
      console.log(`✓ Created partner: ${p.name}`);
    } else {
      console.log(`- Partner exists: ${p.name}`);
    }
    partnerMap.set(p.name, partner.id);
  }

  // 2. Seed Default Reviewer Accounts
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const usersData = [
    {
      name: "Demo Finance Executive",
      email: "demo@reconcilex.com",
      passwordHash,
      role: "FINANCE_EXECUTIVE",
    },
    {
      name: "Demo Co-Founder",
      email: "cofounder@reconcilex.com",
      passwordHash,
      role: "CO_FOUNDER",
    },
  ];

  for (const u of usersData) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
    });
    if (!existing) {
      await prisma.user.create({ data: u });
      console.log(`✓ Created demo user: ${u.email} (${u.role})`);
    } else {
      console.log(`- Demo user exists: ${u.email}`);
    }
  }

  // 3. Seed Courier Rate Cards
  const amazonPartnerId = partnerMap.get("Amazon");
  if (amazonPartnerId) {
    const courierCards = [
      {
        channel: "Amazon",
        courierName: "Delhivery",
        minWeightKg: 0,
        maxWeightKg: 5,
        baseCharge: 50.0,
        perKgCharge: 15.0,
        effectiveFrom: new Date("2025-01-01"),
        partnerId: amazonPartnerId,
      },
      {
        channel: "Amazon",
        courierName: "Blue Dart",
        minWeightKg: 0,
        maxWeightKg: 5,
        baseCharge: 60.0,
        perKgCharge: 20.0,
        effectiveFrom: new Date("2025-01-01"),
        partnerId: amazonPartnerId,
      },
    ];

    for (const card of courierCards) {
      const existing = await prisma.rateCard.findFirst({
        where: {
          channel: card.channel,
          courierName: card.courierName,
          partnerId: card.partnerId,
        },
      });
      if (!existing) {
        await prisma.rateCard.create({ data: card });
        console.log(`✓ Created rate card: ${card.courierName} for ${card.channel}`);
      }
    }
  }

  // 4. Seed Channel Commission Rate Cards
  if (amazonPartnerId) {
    const existingChannel = await prisma.channelRateCard.findFirst({
      where: { channel: "Amazon", partnerId: amazonPartnerId },
    });
    if (!existingChannel) {
      await prisma.channelRateCard.create({
        data: {
          channel: "Amazon",
          commissionPercent: 0.12,
          fixedFee: 10.0,
          otherFee: 5.0,
          effectiveFrom: new Date("2025-01-01"),
          partnerId: amazonPartnerId,
        },
      });
      console.log("✓ Created channel rate card for Amazon");
    }
  }

  console.log("=== DATABASE SEEDING COMPLETED ===\n");
}

seedDatabase()
  .catch((err) => {
    console.error("Seeding error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

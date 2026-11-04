
import prisma from "./config/database.js";

const partners = [
  {
    name: "Amazon",
    type: "MARKETPLACE",
  },
  {
    name: "Flipkart",
    type: "MARKETPLACE",
  },
  {
    name: "D2C Website",
    type: "DIRECT_CHANNEL",
  },
];

async function seedPartners() {
  for (const partner of partners) {
    const existing = await prisma.partner.findFirst({
      where: {
        name: partner.name,
        type: partner.type,
      },
    });

    if (existing) {
      console.log(`Partner already exists: ${partner.name}`);
      continue;
    }

    await prisma.partner.create({
      data: partner,
    });

    console.log(`Created partner: ${partner.name}`);
  }

  console.log("\nPartner seeding completed!");
}

try {
  await seedPartners();
} catch (error) {
  console.error("Partner seeding failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

import prisma from "../config/database.js";

export async function getFinanceTeam() {
  return prisma.user.findMany({
    where: {
      role: "FINANCE_EXECUTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}


import { prisma } from "./config/database.js";

async function testConnection() {
  try {
    await prisma.$connect();

    console.log("PostgreSQL connected successfully!");
  } catch (error) {
    console.error("Database connection failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

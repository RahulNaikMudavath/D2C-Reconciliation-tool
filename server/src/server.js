import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import app from "./app.js";
import { prisma } from "./config/database.js";

const PORT = process.env.PORT || 5000;
let serverInstance;

async function startServer() {
  try {
    await prisma.$connect();

    console.log("PostgreSQL connected successfully!");

    serverInstance = app.listen(PORT, () => {
      console.log(`ReconcileX API running on http://localhost:${PORT}`);
    });

    serverInstance.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`);
      } else {
        console.error("Server error:", error.message);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

async function shutdown() {
  console.log("Shutting down ReconcileX...");

  if (serverInstance) {
    serverInstance.close();
  }

  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();

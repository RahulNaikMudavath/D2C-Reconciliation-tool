import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, "../generated/prisma/client.js");

const content = `export * from "./client.ts";\nexport { PrismaClient } from "./client.ts";\n`;
fs.writeFileSync(target, content, "utf8");
console.log("Generated client.js wrapper successfully.");

import prisma from "../server/src/config/database.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateFiles() {
  console.log("Connecting to database to fetch order records...");

  // 1. Fetch 2,000 orders that currently lack settlements
  const ordersWithoutSettlements = await prisma.order.findMany({
    where: {
      settlements: { none: {} },
      NOT: { orderNumber: { startsWith: "TEST-" } },
    },
    include: {
      partner: true,
    },
    take: 2000,
    orderBy: { id: "asc" },
  });

  console.log(`Found ${ordersWithoutSettlements.length} orders awaiting settlement files.`);

  // Generate 2,000 Marketplace Settlements CSV
  const settlementHeaders = [
    "Order ID",
    "Settlement ID",
    "Partner Name",
    "Settlement Date",
    "Gross Amount",
    "Commission Amount",
    "TCS Amount",
    "TDS Amount",
    "Settlement Amount",
  ];

  const settlementRows = [settlementHeaders.join(",")];

  for (let i = 0; i < ordersWithoutSettlements.length; i++) {
    const order = ordersWithoutSettlements[i];
    const settlementId = `SET-2026-${String(i + 100001).padStart(6, "0")}`;
    const partnerName = order.partner?.name || order.channel || "Amazon";
    const orderValue = Number(order.orderValue || 2500);

    // Realistic calculations
    const grossAmount = orderValue;
    const commission = Number((grossAmount * 0.10).toFixed(2));
    const tcs = Number((grossAmount * 0.01).toFixed(2));
    const tds = Number((grossAmount * 0.01).toFixed(2));
    const expectedNet = Number((grossAmount - commission - tcs - tds).toFixed(2));

    let actualNet = expectedNet;

    // Distribute realistic discrepancies
    if (i % 20 === 0) {
      // 5% confirmed underpayment by ~₹150 to ₹300 (SHORT_PAID -> generates claims)
      actualNet = Number((expectedNet - 150 - (i % 150)).toFixed(2));
    } else if (i % 40 === 0) {
      // 2.5% confirmed zero remittance (UNPAID_PAST_DUE -> generates claims)
      actualNet = 0;
    } else if (i % 15 === 0) {
      // Minor variation within ₹5 tolerance (SETTLED)
      actualNet = Number((expectedNet - 3.5).toFixed(2));
    } else {
      // Exact match (SETTLED)
      actualNet = expectedNet;
    }

    // Format date DD-MM-YYYY
    const d = new Date(order.orderDate || Date.now());
    d.setDate(d.getDate() + 3); // settlement 3 days after order
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const settlementDate = `${dd}-${mm}-${yyyy}`;

    settlementRows.push(
      [
        order.orderNumber,
        settlementId,
        partnerName,
        settlementDate,
        grossAmount.toFixed(2),
        commission.toFixed(2),
        tcs.toFixed(2),
        tds.toFixed(2),
        actualNet.toFixed(2),
      ].join(",")
    );
  }

  const settlementsCsvContent = settlementRows.join("\n");

  // Output paths for settlements
  const destDir1 = path.resolve(__dirname, "../sample-test-files");
  const destDir2 = path.resolve(__dirname, "..");
  fs.mkdirSync(destDir1, { recursive: true });

  const settlementsPath1 = path.join(destDir1, "reconcilex_new_marketplace_settlements_2000.csv");
  const settlementsPath2 = path.join(destDir2, "reconcilex_new_marketplace_settlements_2000.csv");

  fs.writeFileSync(settlementsPath1, settlementsCsvContent, "utf-8");
  fs.writeFileSync(settlementsPath2, settlementsCsvContent, "utf-8");
  console.log(`Created: ${settlementsPath1} (${settlementRows.length - 1} records)`);

  // Generate 1,000 brand new orders CSV as an additional test option
  const orderHeaders = [
    "Order ID",
    "Channel",
    "Partner Name",
    "Order Date",
    "Payment Mode",
    "Delivery Status",
    "Order Value",
    "Expected Net Settlement",
    "Settlement Due Date",
    "Shipment Weight (kg)",
  ];

  const orderRows = [orderHeaders.join(",")];
  const channels = ["Amazon", "Flipkart", "Shopify", "D2C Website"];
  const paymentModes = ["COD", "PREPAID", "ONLINE"];

  for (let i = 1; i <= 1000; i++) {
    const orderNumber = `RX-NEW-${String(i).padStart(5, "0")}`;
    const channel = channels[i % channels.length];
    const partnerName = channel;
    const mode = paymentModes[i % paymentModes.length];
    const value = (500 + (i * 17.5) % 8500).toFixed(2);
    const expected = (Number(value) * 0.88).toFixed(2);
    const weight = (0.5 + (i * 0.08) % 4.5).toFixed(3);

    const today = new Date();
    today.setDate(today.getDate() - (i % 30));
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const orderDate = `${dd}-${mm}-${yyyy}`;

    const due = new Date(today);
    due.setDate(due.getDate() + 7);
    const dueDd = String(due.getDate()).padStart(2, "0");
    const dueMm = String(due.getMonth() + 1).padStart(2, "0");
    const dueYyyy = due.getFullYear();
    const dueDate = `${dueDd}-${dueMm}-${dueYyyy}`;

    orderRows.push(
      [
        orderNumber,
        channel,
        partnerName,
        orderDate,
        mode,
        "Delivered",
        value,
        expected,
        dueDate,
        weight,
      ].join(",")
    );
  }

  const ordersCsvContent = orderRows.join("\n");
  const ordersPath1 = path.join(destDir1, "reconcilex_new_orders_1000.csv");
  const ordersPath2 = path.join(destDir2, "reconcilex_new_orders_1000.csv");

  fs.writeFileSync(ordersPath1, ordersCsvContent, "utf-8");
  fs.writeFileSync(ordersPath2, ordersCsvContent, "utf-8");
  console.log(`Created: ${ordersPath1} (${orderRows.length - 1} records)`);

  await prisma.$disconnect();
  console.log("Successfully generated all test CSV files!");
}

generateFiles().catch((err) => {
  console.error("Error generating files:", err);
  process.exit(1);
});

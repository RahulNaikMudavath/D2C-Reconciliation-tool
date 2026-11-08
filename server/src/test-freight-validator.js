import { validateImportRecords } from "./imports/validators/importValidator.js";

const records = [
  {
    orderNumber: "RX-1001",
    courierName: "BlueDart",
    chargedAmount: "85",
    actualWeight: "1.5",
    invoiceNumber: "INV-001",
    chargedAt: "2026-11-01",
  },
  {
    orderNumber: "RX-1002",
    courierName: "Delhivery",
    chargedAmount: "120",
    actualWeight: "2",
    invoiceNumber: "INV-002",
    chargedAt: "2026-11-02",
  },
  {
    orderNumber: "RX-1003",
    courierName: "",
    chargedAmount: "100",
    actualWeight: "1.2",
  },
  {
    orderNumber: "RX-1004",
    courierName: "BlueDart",
    chargedAmount: "invalid",
    actualWeight: "-2",
  },
];

const result = validateImportRecords(records, {
  importType: "FREIGHT",
});

console.log("TOTAL:", result.totalRows);
console.log("VALID:", result.validCount);
console.log("REJECTED:", result.rejectedCount);

console.log("\nVALID RECORDS:");
console.log(JSON.stringify(result.validRecords, null, 2));

console.log("\nREJECTED RECORDS:");
console.log(JSON.stringify(result.rejectedRecords, null, 2));

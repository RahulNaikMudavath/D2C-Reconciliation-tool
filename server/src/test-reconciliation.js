import { reconcileSettlement } from "./services/reconciliationService.js";

const currentDate = new Date("2026-11-04T00:00:00.000Z");

const scenarios = [
  {
    name: "Fully settled",
    expectedAmount: "1409.00",
    actualAmount: "1409.00",
    dueDate: "2026-11-03T00:00:00.000Z",
  },
  {
    name: "Difference exactly ₹10",
    expectedAmount: "1409.00",
    actualAmount: "1399.00",
    dueDate: "2026-11-03T00:00:00.000Z",
  },
  {
    name: "Short payment",
    expectedAmount: "1409.00",
    actualAmount: "1372.00",
    dueDate: "2026-11-03T00:00:00.000Z",
  },
  {
    name: "₹37 short, payment not yet due",
    expectedAmount: "1409.00",
    actualAmount: "1372.00",
    dueDate: "2026-11-06T00:00:00.000Z",
  },
  {
    name: "₹37 short, payment overdue",
    expectedAmount: "1409.00",
    actualAmount: "1372.00",
    dueDate: "2026-11-03T00:00:00.000Z",
  },
  {
    name: "Unpaid past due",
    expectedAmount: "1409.00",
    actualAmount: null,
    dueDate: "2026-11-03T00:00:00.000Z",
  },
  {
    name: "Payment not yet due",
    expectedAmount: "1409.00",
    actualAmount: null,
    dueDate: "2026-11-06T00:00:00.000Z",
  },
  {
    name: "Overpayment",
    expectedAmount: "1409.00",
    actualAmount: "1450.00",
    dueDate: "2026-11-03T00:00:00.000Z",
  },
];

for (const scenario of scenarios) {
  const result = reconcileSettlement({
    ...scenario,
    currentDate,
  });

  console.log(`\n${scenario.name}`);
  console.log(JSON.stringify(result, null, 2));
}

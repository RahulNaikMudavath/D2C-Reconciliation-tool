import { reconcileFreight } from "./services/freightReconciliationService.js";

const testCases = [
  {
    name: "Overcharged freight",
    partnerId: "01ea6647-ad0b-4ec6-abe4-1d918e198019",
    channel: "AMAZON",
    courierName: "BlueDart",
    chargedAmount: "85.00",
    actualWeight: "1.500",
    orderDate: new Date("2026-11-01"),
  },
  {
    name: "No matching courier rate card",
    partnerId: "01ea6647-ad0b-4ec6-abe4-1d918e198019",
    channel: "AMAZON",
    courierName: "UnknownCourier",
    chargedAmount: "100.00",
    actualWeight: "1.500",
    orderDate: new Date("2026-11-01"),
  },
];

for (const testCase of testCases) {
  const { name, ...input } = testCase;

  try {
    const result = await reconcileFreight(input);
    console.log(`\n${name}:`);
    console.log(result);
  } catch (error) {
    console.error(`${name} failed:`, error.message);
  }
}

import assert from 'node:assert/strict';
import {
  normalizeColumns,
  COLUMN_ALIASES_BY_TYPE,
} from '../src/imports/normalizers/columnNormalizer.js';
import {
  parseDateSafe,
  parseDecimalSafe,
} from '../src/imports/validators/importValidator.js';
import Decimal from 'decimal.js';

async function runRegressionTests() {
  console.log('=== RUNNING COLUMN MAPPING & DATE PARSING REGRESSION TESTS ===\n');
  let passed = 0;

  // 1. Expected Net Settlement mapping
  console.log('TEST 1: Expected Net Settlement mapping in ORDERS...');
  const res1 = normalizeColumns([
    {
      'Order ID': 'RX-100',
      'Expected Net Settlement': '₹2,734.17',
    },
  ], 'ORDERS');
  assert.equal(res1.columnMapping.expectedSettlementAmount, 'Expected Net Settlement');
  assert.equal(res1.normalizedRecords[0].expectedSettlementAmount, '₹2,734.17');
  console.log('✓ Passed: Expected Net Settlement correctly maps to expectedSettlementAmount.\n');
  passed++;

  // 2. Shipment Weight (kg) mapping
  console.log('TEST 2: Shipment Weight (kg) mapping in ORDERS...');
  const res2 = normalizeColumns([
    {
      'Order ID': 'RX-100',
      'Shipment Weight (kg)': '3.703',
    },
  ], 'ORDERS');
  assert.equal(res2.columnMapping.weightKg, 'Shipment Weight (kg)');
  assert.equal(res2.normalizedRecords[0].weightKg, '3.703');
  console.log('✓ Passed: Shipment Weight (kg) correctly maps to weightKg.\n');
  passed++;

  // 3. DD-MM-YYYY dates where the day is 01–12 (Prevent day/month swapping)
  console.log('TEST 3: DD-MM-YYYY parsing where day is 01–12 (Day/Month swap prevention)...');
  const d1 = parseDateSafe('03-11-2026');
  assert.ok(d1, '03-11-2026 should parse');
  assert.equal(d1.getUTCDate(), 3, 'Day must be 3 (not 11)');
  assert.equal(d1.getUTCMonth() + 1, 11, 'Month must be 11 (November, not March)');
  assert.equal(d1.getUTCFullYear(), 2026, 'Year must be 2026');

  const d2 = parseDateSafe('08-11-2026');
  assert.equal(d2.getUTCDate(), 8, 'Day must be 8');
  assert.equal(d2.getUTCMonth() + 1, 11, 'Month must be 11 (November, not August)');

  const d3 = parseDateSafe('10-11-2026');
  assert.equal(d3.getUTCDate(), 10, 'Day must be 10');
  assert.equal(d3.getUTCMonth() + 1, 11, 'Month must be 11 (November, not October)');
  console.log('✓ Passed: Ambiguous dates (03-11-2026, 08-11-2026, 10-11-2026) strictly parsed as DD-MM-YYYY.\n');
  passed++;

  // 4. DD-MM-YYYY dates where the day is 13–31
  console.log('TEST 4: DD-MM-YYYY parsing where day is 13–31...');
  const d4 = parseDateSafe('31-10-2026');
  assert.equal(d4.getUTCDate(), 31);
  assert.equal(d4.getUTCMonth() + 1, 10);
  assert.equal(d4.getUTCFullYear(), 2026);

  const d5 = parseDateSafe('15-10-2026');
  assert.equal(d5.getUTCDate(), 15);
  assert.equal(d5.getUTCMonth() + 1, 10);
  console.log('✓ Passed: Unambiguous DD-MM-YYYY dates (31-10-2026, 15-10-2026) parsed accurately.\n');
  passed++;

  // 5. ISO date parsing
  console.log('TEST 5: Explicit ISO date parsing...');
  const isoDate = parseDateSafe('2026-11-03');
  assert.equal(isoDate.toISOString(), '2026-11-03T00:00:00.000Z');

  const isoTimestamp = parseDateSafe('2026-11-03T14:45:00.000Z');
  assert.equal(isoTimestamp.toISOString(), '2026-11-03T14:45:00.000Z');
  console.log('✓ Passed: ISO date strings parsed correctly.\n');
  passed++;

  // 6. Excel serial date parsing
  console.log('TEST 6: Excel serial date parsing...');
  const excelNum = parseDateSafe(46330);
  assert.equal(excelNum.toISOString(), '2026-11-04T00:00:00.000Z');

  const excelStr = parseDateSafe('46330');
  assert.equal(excelStr.toISOString(), '2026-11-04T00:00:00.000Z');
  console.log('✓ Passed: Excel serial numbers parsed to valid Date.\n');
  passed++;

  // 7. Invalid & impossible dates rejection
  console.log('TEST 7: Invalid & impossible dates rejection...');
  assert.equal(parseDateSafe('31-02-2026'), null, 'Feb 31 must be rejected');
  assert.equal(parseDateSafe('29-02-2025'), null, 'Feb 29 on non-leap year must be rejected');
  assert.equal(parseDateSafe('invalid-text-date'), null, 'Malformed text must be rejected');
  assert.equal(parseDateSafe('99-99-9999'), null, 'Out of bounds values must be rejected');
  console.log('✓ Passed: Impossible and invalid dates safely returned null.\n');
  passed++;

  // 8. UTC date consistency
  console.log('TEST 8: UTC date consistency for date-only inputs...');
  const dateUtc = parseDateSafe('03-11-2026');
  assert.equal(dateUtc.getUTCHours(), 0);
  assert.equal(dateUtc.getUTCMinutes(), 0);
  assert.equal(dateUtc.getUTCSeconds(), 0);
  assert.equal(dateUtc.toISOString(), '2026-11-03T00:00:00.000Z');
  console.log('✓ Passed: Date-only values maintain consistent UTC midnight.\n');
  passed++;

  // 9. Currency values with ₹, $, and commas
  console.log('TEST 9: Currency sanitization (symbols and commas)...');
  const c1 = parseDecimalSafe('₹2,734.17');
  assert.equal(c1.toString(), '2734.17');

  const c2 = parseDecimalSafe('₹10,41,38,274.61');
  assert.equal(c2.toString(), '104138274.61');

  const c3 = parseDecimalSafe('$1,234,567.89');
  assert.equal(c3.toString(), '1234567.89');
  console.log('✓ Passed: Currency symbols (₹, $) and thousand commas parsed into Decimal.\n');
  passed++;

  // 10. All six import types alias scoping remains intact
  console.log('TEST 10: All six import types alias scoping isolation...');
  const types = ['ORDERS', 'SETTLEMENTS', 'COD', 'FREIGHT', 'RETURNS', 'WAREHOUSE_RECEIPTS'];
  for (const t of types) {
    assert.ok(COLUMN_ALIASES_BY_TYPE[t], `Alias dictionary for ${t} must exist`);
  }

  // Ensure ORDERS has weightKg and expectedSettlementAmount
  assert.ok(COLUMN_ALIASES_BY_TYPE.ORDERS.weightKg.includes('shipment weight kg'));
  assert.ok(COLUMN_ALIASES_BY_TYPE.ORDERS.expectedSettlementAmount.includes('expected net settlement'));

  // Ensure FREIGHT uses actualWeight, not weightKg
  assert.ok(COLUMN_ALIASES_BY_TYPE.FREIGHT.actualWeight);
  assert.equal(COLUMN_ALIASES_BY_TYPE.FREIGHT.weightKg, undefined, 'FREIGHT must not have weightKg');

  // Ensure SETTLEMENTS uses amount, not orderValue
  assert.ok(COLUMN_ALIASES_BY_TYPE.SETTLEMENTS.amount);
  assert.equal(COLUMN_ALIASES_BY_TYPE.SETTLEMENTS.orderValue, undefined, 'SETTLEMENTS must not have orderValue');

  console.log('✓ Passed: All six import categories strictly maintain domain-isolated alias sets.\n');
  passed++;

  console.log('======================================================================');
  console.log(`ALL ${passed} / 10 REGRESSION TESTS PASSED!`);
  console.log('======================================================================\n');
}

runRegressionTests().catch((err) => {
  console.error('Regression tests failed:', err);
  process.exit(1);
});

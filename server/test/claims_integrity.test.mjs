import assert from 'node:assert/strict';
import prisma from '../src/config/database.js';
import { generateClaims, invalidateFalseSettlementClaims } from '../src/services/claimService.js';
import { getDashboardSummary } from '../src/services/dashboardService.js';
import Decimal from 'decimal.js';

async function runClaimsIntegrityTests() {
  console.log('=== RUNNING RECONCILEX CLAIMS INTEGRITY TEST SUITE ===\n');
  let passedTests = 0;

  // Setup test partner and user
  let testPartner = await prisma.partner.findFirst();
  let testUser = await prisma.user.findFirst();

  // --------------------------------------------------------------------------
  // TEST 1: Missing settlement file -> NO claim generated
  // --------------------------------------------------------------------------
  console.log('TEST 1: Missing settlement file (actualAmount is null) produces NO claim...');
  const testRun1 = await prisma.reconciliationRun.create({
    data: {
      status: 'COMPLETED',
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  const testOrder1 = await prisma.order.create({
    data: {
      orderNumber: 'TEST-NO-CLAIM-' + Date.now(),
      channel: 'SHOPIFY',
      partnerId: testPartner.id,
      orderDate: new Date(),
      orderValue: 1500,
      expectedSettlementAmount: 1350,
      paymentMode: 'PREPAID',
      deliveryStatus: 'DELIVERED',
    },
  });

  const testMatch1 = await prisma.reconciliationMatch.create({
    data: {
      runId: testRun1.id,
      orderId: testOrder1.id,
      status: 'REVIEW_REQUIRED',
      expectedAmount: 1350,
      actualAmount: null, // No settlement file imported!
      difference: null,
      reviewReason: 'Settlement remittance file not yet imported',
    },
  });

  const genResult1 = await generateClaims(testRun1.id);
  const createdClaims1 = await prisma.claim.findMany({
    where: { matchId: testMatch1.id },
  });

  assert.equal(createdClaims1.length, 0, 'No claim should be generated when settlement is missing');
  assert.equal(genResult1.totalCreated, 0, 'Total created should be 0');
  console.log('✓ Passed: Missing settlement file produces 0 claims.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 2: Confirmed overdue underpayment -> Valid claim generated
  // --------------------------------------------------------------------------
  console.log('TEST 2: Confirmed overdue underpayment (actualAmount !== null) produces valid claim...');
  const testRun2 = await prisma.reconciliationRun.create({
    data: {
      status: 'COMPLETED',
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  const testOrder2 = await prisma.order.create({
    data: {
      orderNumber: 'TEST-SHORT-PAID-' + Date.now(),
      channel: 'AMAZON',
      partnerId: testPartner.id,
      orderDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      settlementDueAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // Overdue
      orderValue: 2000,
      expectedSettlementAmount: 1800,
      paymentMode: 'PREPAID',
      deliveryStatus: 'DELIVERED',
    },
  });

  const testMatch2 = await prisma.reconciliationMatch.create({
    data: {
      runId: testRun2.id,
      orderId: testOrder2.id,
      status: 'SHORT_PAID',
      expectedAmount: 1800,
      actualAmount: 1550, // Confirmed remittance received, but underpaid!
      difference: 250, // Short paid by 250 (> 10 threshold)
    },
  });

  const genResult2 = await generateClaims(testRun2.id);
  const createdClaims2 = await prisma.claim.findMany({
    where: { matchId: testMatch2.id },
  });

  assert.equal(createdClaims2.length, 1, 'Exactly 1 claim should be generated for short-paid order');
  assert.equal(Number(createdClaims2[0].amount), 250, 'Claim amount must equal the underpaid difference');
  assert.equal(createdClaims2[0].status, 'OPEN', 'Claim status must be OPEN');
  console.log(`✓ Passed: Confirmed underpayment generated valid claim ${createdClaims2[0].claimNumber} for ₹250.00.\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 3: Freight overcharge -> Valid claim generated
  // --------------------------------------------------------------------------
  console.log('TEST 3: Freight overcharge (freightDifference > 10) produces valid claim...');
  const testRun3 = await prisma.reconciliationRun.create({
    data: {
      status: 'COMPLETED',
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  const testOrder3 = await prisma.order.create({
    data: {
      orderNumber: 'TEST-FREIGHT-OVERCHARGE-' + Date.now(),
      channel: 'BLUEDART',
      partnerId: testPartner.id,
      orderDate: new Date(),
      orderValue: 1200,
      expectedSettlementAmount: 1100,
      paymentMode: 'PREPAID',
      deliveryStatus: 'DELIVERED',
    },
  });

  const testMatch3 = await prisma.reconciliationMatch.create({
    data: {
      runId: testRun3.id,
      orderId: testOrder3.id,
      status: 'SETTLED',
      expectedAmount: 1100,
      actualAmount: 1100,
      difference: 0,
      freightStatus: 'FREIGHT_OVERCHARGED',
      expectedFreightAmount: 65,
      actualFreightAmount: 150,
      freightDifference: 85, // Overcharged by ₹85 (> 10 threshold)
    },
  });

  const genResult3 = await generateClaims(testRun3.id);
  const createdClaims3 = await prisma.claim.findMany({
    where: { matchId: testMatch3.id },
  });

  assert.equal(createdClaims3.length, 1, 'Exactly 1 claim should be generated for freight overcharge');
  assert.equal(Number(createdClaims3[0].amount), 85, 'Claim amount must equal the freight overcharge');
  assert.equal(createdClaims3[0].status, 'OPEN', 'Claim status must be OPEN');
  console.log(`✓ Passed: Freight overcharge generated valid claim ${createdClaims3[0].claimNumber} for ₹85.00.\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 4: False claim invalidation & audit evidence preservation
  // --------------------------------------------------------------------------
  console.log('TEST 4: Invalidate false claim without deleting records and preserve audit evidence...');
  // Create an artificial unimported false claim
  const testOrder4 = await prisma.order.create({
    data: {
      orderNumber: 'TEST-FALSE-CLAIM-' + Date.now(),
      channel: 'SHOPIFY',
      partnerId: testPartner.id,
      orderDate: new Date(),
      orderValue: 500,
      expectedSettlementAmount: 450,
      paymentMode: 'PREPAID',
      deliveryStatus: 'DELIVERED',
    },
  });

  const testMatch4 = await prisma.reconciliationMatch.create({
    data: {
      runId: testRun1.id,
      orderId: testOrder4.id,
      status: 'UNPAID_PAST_DUE',
      expectedAmount: 450,
      actualAmount: null,
      difference: 450,
    },
  });

  const testClaim4 = await prisma.claim.create({
    data: {
      claimNumber: 'RX-CLM-TEST-' + Date.now().toString(36).toUpperCase(),
      description: `UNPAID PAST DUE for order ${testOrder4.orderNumber}`,
      amount: 450,
      status: 'OPEN',
      partnerId: testPartner.id,
      matchId: testMatch4.id,
      evidence: {
        orderNumber: testOrder4.orderNumber,
        originalStatus: 'UNPAID_PAST_DUE',
      },
    },
  });

  // Execute invalidation
  const invResult = await invalidateFalseSettlementClaims({ userId: testUser.id, runId: testRun1.id });
  assert.ok(invResult.invalidatedCount >= 1, 'At least 1 false claim should be invalidated');

  // Verify claim was NOT deleted, but transitioned to REJECTED with audit evidence
  const checkedClaim4 = await prisma.claim.findUnique({
    where: { id: testClaim4.id },
  });

  assert.ok(checkedClaim4, 'Claim record must still exist in the database (never deleted)');
  assert.equal(checkedClaim4.status, 'REJECTED', 'Claim status must be updated to REJECTED');
  assert.ok(checkedClaim4.evidence?.invalidation?.invalidated, 'Evidence must contain invalidation metadata');
  assert.ok(checkedClaim4.evidence?.invalidation?.invalidationReason, 'Evidence must contain invalidation reason');

  // Verify AuditLog entry was recorded
  const auditEntry = await prisma.auditLog.findFirst({
    where: { action: 'CLAIMS_AUTO_INVALIDATED' },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(auditEntry, 'An immutable AuditLog entry must exist for batch invalidation');
  console.log(`✓ Passed: False claim safely marked REJECTED with full audit trail in evidence and AuditLog.\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 5: Dashboard open claims & claim value agree with active claims
  // --------------------------------------------------------------------------
  console.log('TEST 5: Dashboard open claim count and claim value agree with active DB records...');
  const activeDbClaims = await prisma.claim.findMany({
    where: {
      status: { in: ['OPEN', 'IN_REVIEW'] },
      NOT: {
        AND: [
          { description: { contains: 'UNPAID PAST DUE' } },
          { match: { order: { settlements: { none: {} } } } },
        ],
      },
    },
    select: { amount: true },
  });

  const expectedActiveCount = activeDbClaims.length;
  const expectedActiveSum = activeDbClaims.reduce(
    (sum, c) => sum.plus(c.amount?.toString() ?? '0'),
    new Decimal(0)
  );

  const dashboardSummary = await getDashboardSummary();
  assert.equal(dashboardSummary.openClaims, expectedActiveCount, 'Dashboard openClaims must match active DB claim count');
  assert.equal(
    new Decimal(dashboardSummary.totalClaimValue).toFixed(2),
    expectedActiveSum.toFixed(2),
    'Dashboard totalClaimValue must match active DB claim amount'
  );

  console.log(`✓ Passed: Dashboard displays ${dashboardSummary.openClaims} open claims totaling ₹${dashboardSummary.totalClaimValue}, exactly matching active database records.`);
  passedTests++;

  // Cleanup test artifacts
  await prisma.claim.deleteMany({
    where: {
      id: { in: [createdClaims2[0]?.id, createdClaims3[0]?.id, testClaim4.id].filter(Boolean) },
    },
  });
  await prisma.reconciliationMatch.deleteMany({
    where: { id: { in: [testMatch1.id, testMatch2.id, testMatch3.id, testMatch4.id] } },
  });
  await prisma.order.deleteMany({
    where: { id: { in: [testOrder1.id, testOrder2.id, testOrder3.id, testOrder4.id] } },
  });
  await prisma.reconciliationRun.deleteMany({
    where: { id: { in: [testRun1.id, testRun2.id, testRun3.id] } },
  });

  console.log(`\n======================================================`);
  console.log(`ALL ${passedTests} / 5 CLAIMS INTEGRITY TESTS PASSED!`);
  console.log(`======================================================\n`);
}

runClaimsIntegrityTests()
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  })
  .finally(() => process.exit(0));

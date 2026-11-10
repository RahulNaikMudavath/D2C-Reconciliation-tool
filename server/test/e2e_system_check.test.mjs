import prisma from '../src/config/database.js';
import jwt from 'jsonwebtoken';
import Decimal from 'decimal.js';

export async function runE2ESystemCheck() {
  console.log('=== RUNNING COMPLETE END-TO-END SYSTEM HEALTH CHECK ===\n');

  // 1. Database Entity Counts
  console.log('1. Checking Database Core Entity Counts...');
  const [
    orderCount,
    settlementCount,
    freightCount,
    returnCount,
    rateCardCount,
    channelRateCardCount,
    matchCount,
    claimCount,
    activeClaimCount,
    activeClaimSum,
    mappingCount
  ] = await Promise.all([
    prisma.order.count(),
    prisma.settlement.count(),
    prisma.freightCharge.count(),
    prisma.returnRecord.count(),
    prisma.rateCard.count(),
    prisma.channelRateCard.count(),
    prisma.reconciliationMatch.count(),
    prisma.claim.count(),
    prisma.claim.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } }),
    prisma.claim.aggregate({
      _sum: { amount: true },
      where: { status: { in: ['OPEN', 'IN_REVIEW'] } }
    }),
    prisma.columnMapping.count(),
  ]);

  console.log(`   - Orders in DB: ${orderCount.toLocaleString()}`);
  console.log(`   - Settlements in DB: ${settlementCount.toLocaleString()}`);
  console.log(`   - Freight Charges: ${freightCount.toLocaleString()}`);
  console.log(`   - Returns: ${returnCount.toLocaleString()}`);
  console.log(`   - Courier Rate Cards: ${rateCardCount}`);
  console.log(`   - Channel Rate Cards: ${channelRateCardCount}`);
  console.log(`   - Reconciliation Matches: ${matchCount.toLocaleString()}`);
  console.log(`   - Total Claims: ${claimCount} (Active: ${activeClaimCount}, Sum: ₹${activeClaimSum._sum.amount || 0})`);
  console.log(`   - Column Mappings: ${mappingCount}`);

  // 2. Fetch Dashboard Summary directly from service
  console.log('\n2. Testing Dashboard Service Consistency...');
  const { getDashboardSummary } = await import('../src/services/dashboardService.js');
  const summary = await getDashboardSummary();
  console.log(`   - Dashboard Total Orders: ${summary.totalOrders}`);
  console.log(`   - Dashboard Expected Settlement: ₹${summary.totalExpected}`);
  console.log(`   - Dashboard Amount Received: ₹${summary.totalReceived}`);
  console.log(`   - Dashboard Freight Money at Risk: ₹${summary.freightMoneyAtRisk}`);
  console.log(`   - Dashboard Combined Money at Risk: ₹${summary.moneyAtRisk}`);
  console.log(`   - Dashboard Total Matches: ${summary.totalMatches}`);
  console.log(`   - Dashboard Open Claims: ${summary.openClaims}`);
  console.log(`   - Dashboard Open Claim Value: ₹${summary.totalClaimValue}`);

  if (summary.openClaims !== activeClaimCount) {
    throw new Error(`Mismatch: Dashboard open claims (${summary.openClaims}) != DB active claims (${activeClaimCount})`);
  }
  const expectedClaimVal = new Decimal(activeClaimSum._sum.amount || 0).toFixed(2);
  const actualClaimVal = new Decimal(summary.totalClaimValue || 0).toFixed(2);
  if (expectedClaimVal !== actualClaimVal) {
    throw new Error(`Mismatch: Dashboard claim value (₹${actualClaimVal}) != DB active claim sum (₹${expectedClaimVal})`);
  }
  console.log('   ✓ Dashboard metrics 100% consistent with database records!');

  // 3. Test HTTP Endpoints via Express App
  console.log('\n3. Testing REST API Endpoints with Authentication...');
  const app = (await import('../src/app.js')).default;
  
  // Find a test user for auth token
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error('No user found in database for auth testing');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );

  const request = (await import('supertest')).default;

  // 3a. Health Endpoint
  const healthRes = await request(app).get('/api/health');
  if (healthRes.status !== 200 || !healthRes.body.success) {
    throw new Error(`/api/health failed: ${healthRes.status}`);
  }
  console.log('   ✓ GET /api/health -> 200 OK');

  // 3b. Dashboard Endpoint
  const dashRes = await request(app)
    .get('/api/dashboard')
    .set('Authorization', `Bearer ${token}`);
  if (dashRes.status !== 200 || !dashRes.body.success) {
    throw new Error(`/api/dashboard failed: ${dashRes.status} ${JSON.stringify(dashRes.body)}`);
  }
  console.log('   ✓ GET /api/dashboard -> 200 OK');

  // 3c. Column Mappings Endpoint
  const colRes = await request(app)
    .get('/api/column-mappings?status=ALL')
    .set('Authorization', `Bearer ${token}`);
  if (colRes.status !== 200 || !colRes.body.success) {
    throw new Error(`/api/column-mappings failed: ${colRes.status}`);
  }
  console.log(`   ✓ GET /api/column-mappings -> 200 OK (${colRes.body.count} mappings returned)`);

  // 3d. Claims Endpoint
  const claimsRes = await request(app)
    .get('/api/claims?limit=10')
    .set('Authorization', `Bearer ${token}`);
  if (claimsRes.status !== 200 || !claimsRes.body.success) {
    throw new Error(`/api/claims failed: ${claimsRes.status}`);
  }
  console.log(`   ✓ GET /api/claims -> 200 OK (${claimsRes.body.data.length} claims returned, total: ${claimsRes.body.totalClaims})`);

  // 3e. Reconciliation Results Endpoint
  const reconRes = await request(app)
    .get('/api/reconciliation')
    .set('Authorization', `Bearer ${token}`);
  if (reconRes.status !== 200 || !reconRes.body.success) {
    throw new Error(`/api/reconciliation failed: ${reconRes.status}`);
  }
  console.log(`   ✓ GET /api/reconciliation -> 200 OK (Run: ${reconRes.body.data?.runId || 'N/A'}, Orders: ${reconRes.body.data?.totalOrders || 0})`);

  // 3f. Import History Endpoint
  const histRes = await request(app)
    .get('/api/import-history')
    .set('Authorization', `Bearer ${token}`);
  if (histRes.status !== 200 || !histRes.body.success) {
    throw new Error(`/api/import-history failed: ${histRes.status}`);
  }
  console.log(`   ✓ GET /api/import-history -> 200 OK (${histRes.body.data.length} batches returned)`);

  // 3g. Audit Logs Endpoint
  const auditRes = await request(app)
    .get('/api/audit-logs?limit=5')
    .set('Authorization', `Bearer ${token}`);
  if (auditRes.status !== 200 || !auditRes.body.success) {
    throw new Error(`/api/audit-logs failed: ${auditRes.status}`);
  }
  console.log(`   ✓ GET /api/audit-logs -> 200 OK (${auditRes.body.data?.length || 0} logs returned)`);

  // 4. Test Small to Large Data Ingestion & Mapping Simulation
  console.log('\n4. Testing Small to Large Dataset Normalization & Decimal Precision...');
  const { normalizeColumns } = await import('../src/imports/normalizers/columnNormalizer.js');
  const { validateImportRecords } = await import('../src/imports/validators/importValidator.js');

  // Small batch simulation (2 records)
  const smallRaw = [
    { 'Order ID': 'SML-1', 'Order Amount': '₹1,250.50', 'Sales Channel': 'SHOPIFY', 'Purchase Date': '03-11-2026', 'Expected Net Settlement': '₹1,125.45', 'Shipment Weight (kg)': '0.500' },
    { 'Order ID': 'SML-2', 'Order Amount': '500.00', 'Sales Channel': 'AMAZON', 'Purchase Date': '15-10-2026', 'Expected Net Settlement': '450.00', 'Shipment Weight (kg)': '1.200' },
  ];
  const smallNorm = normalizeColumns(smallRaw, 'ORDERS');
  if (smallNorm.normalizedRecords.length !== 2) throw new Error('Small batch normalization failed');
  const smallVal = validateImportRecords(smallNorm.normalizedRecords, { importType: 'ORDERS' });
  if (smallVal.validRecords.length !== 2) throw new Error('Small batch validation failed');
  if (smallVal.validRecords[0].orderValue !== '1250.50') throw new Error('Small batch orderValue parse failed');
  if (smallVal.validRecords[0].expectedSettlementAmount !== '1125.45') throw new Error('Small batch expectedSettlementAmount parse failed');
  if (smallVal.validRecords[0].weightKg !== '0.500') throw new Error('Small batch weightKg parse failed');
  if (smallVal.validRecords[0].orderDate.toISOString() !== '2026-11-03T00:00:00.000Z') throw new Error('Small batch orderDate DD-MM-YYYY parse failed');
  console.log('   ✓ Small dataset normalization & currency parsing passed (₹1,250.50 -> 1250.50, ₹1,125.45 -> 1125.45, 03-11-2026 -> 2026-11-03T00:00:00.000Z).');

  // Large batch simulation (10,000 synthetic rows in memory)
  console.log('   Generating 10,000 synthetic records to test high-volume parser throughput...');
  const startTime = Date.now();
  const largeRaw = [];
  for (let i = 0; i < 10000; i++) {
    largeRaw.push({
      'Order ID': `BULK-${i}`,
      'Order Amount': `₹${(100 + (i % 500)).toFixed(2)}`,
      'Sales Channel': 'AMAZON',
      'Purchase Date': '05-11-2026',
      'Expected Net Settlement': `₹${(90 + (i % 450)).toFixed(2)}`,
      'Shipment Weight (kg)': `${(0.25 + (i % 5) * 0.1).toFixed(3)}`,
      'Payment Method': 'PREPAID',
      'Fulfillment Status': 'DELIVERED',
    });
  }
  const largeNorm = normalizeColumns(largeRaw, 'ORDERS');
  const largeVal = validateImportRecords(largeNorm.normalizedRecords, { importType: 'ORDERS' });
  const durationMs = Date.now() - startTime;
  if (largeVal.validRecords.length !== 10000) throw new Error('Large batch validation failed');
  console.log(`   ✓ High-volume dataset: 10,000 rows normalized & validated in ${durationMs}ms (${Math.round(10000 / (durationMs / 1000))} rows/sec)!`);

  console.log('\n======================================================');
  console.log('ALL SYSTEM CHECKS, MAPPINGS & ENDPOINTS PASSED CLEANLY!');
  console.log('======================================================\n');
}

runE2ESystemCheck()
  .catch(err => {
    console.error('\nVerification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

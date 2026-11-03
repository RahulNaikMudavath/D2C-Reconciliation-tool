-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FINANCE_EXECUTIVE', 'CO_FOUNDER');

-- CreateEnum
CREATE TYPE "ImportType" AS ENUM ('ORDERS', 'SETTLEMENTS', 'COD', 'FREIGHT', 'RETURNS', 'WAREHOUSE_RECEIPTS');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('SETTLED', 'SHORT_PAID', 'UNPAID_PAST_DUE', 'FREIGHT_OVERCHARGED', 'RETURN_NOT_RECEIVED', 'REVIEW_REQUIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FINANCE_EXECUTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importType" "ImportType" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRecord" (
    "id" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "normalizedData" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "importBatchId" TEXT NOT NULL,

    CONSTRAINT "SourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColumnMapping" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "mapping" JSONB NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importBatchId" TEXT NOT NULL,

    CONSTRAINT "ColumnMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "deliveryStatus" TEXT NOT NULL,
    "expectedAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "partnerId" TEXT,
    "amountReceived" DECIMAL(14,2) NOT NULL,
    "tcsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tdsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "settlementDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateCard" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "courierName" TEXT,
    "baseCharge" DECIMAL(10,2) NOT NULL,
    "perKgCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "partnerId" TEXT NOT NULL,

    CONSTRAINT "RateCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreightCharge" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courierName" TEXT NOT NULL,
    "chargedAmount" DECIMAL(14,2) NOT NULL,
    "actualWeight" DECIMAL(10,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreightCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnRecord" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "warehouseReceivedAt" TIMESTAMP(3),

    CONSTRAINT "ReturnRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationMatch" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "settlementId" TEXT,
    "freightChargeId" TEXT,
    "returnRecordId" TEXT,
    "status" "ReconciliationStatus" NOT NULL,
    "expectedAmount" DECIMAL(14,2) NOT NULL,
    "actualAmount" DECIMAL(14,2) NOT NULL,
    "difference" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'OPEN',
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "partnerId" TEXT NOT NULL,
    "ownerId" TEXT,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ImportBatch_importType_status_idx" ON "ImportBatch"("importType", "status");

-- CreateIndex
CREATE INDEX "SourceRecord_importBatchId_rowNumber_idx" ON "SourceRecord"("importBatchId", "rowNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ColumnMapping_sourceName_version_key" ON "ColumnMapping"("sourceName", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_orderDate_channel_idx" ON "Order"("orderDate", "channel");

-- CreateIndex
CREATE INDEX "RateCard_channel_courierName_effectiveFrom_idx" ON "RateCard"("channel", "courierName", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ReconciliationMatch_status_orderId_idx" ON "ReconciliationMatch"("status", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_claimNumber_key" ON "Claim"("claimNumber");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRecord" ADD CONSTRAINT "SourceRecord_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColumnMapping" ADD CONSTRAINT "ColumnMapping_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreightCharge" ADD CONSTRAINT "FreightCharge_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRecord" ADD CONSTRAINT "ReturnRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_freightChargeId_fkey" FOREIGN KEY ("freightChargeId") REFERENCES "FreightCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_returnRecordId_fkey" FOREIGN KEY ("returnRecordId") REFERENCES "ReturnRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

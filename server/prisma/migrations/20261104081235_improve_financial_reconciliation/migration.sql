/*
  Warnings:

  - You are about to drop the column `createdAt` on the `FreightCharge` table. All the data in the column will be lost.
  - You are about to drop the column `expectedAmount` on the `Order` table. All the data in the column will be lost.
  - Added the required column `orderValue` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Made the column `courierName` on table `RateCard` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FreightCharge" DROP COLUMN "createdAt",
ADD COLUMN     "chargedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "invoiceNumber" TEXT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "expectedAmount",
ADD COLUMN     "expectedSettlementAmount" DECIMAL(14,2),
ADD COLUMN     "orderValue" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "settlementDueAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "weightKg" DECIMAL(10,3);

-- AlterTable
ALTER TABLE "RateCard" ADD COLUMN     "maxWeightKg" DECIMAL(10,3),
ADD COLUMN     "minWeightKg" DECIMAL(10,3) NOT NULL DEFAULT 0,
ALTER COLUMN "courierName" SET NOT NULL;

-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "commissionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "grossAmount" DECIMAL(14,2),
ADD COLUMN     "otherFeeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "referenceNumber" TEXT;

-- CreateTable
CREATE TABLE "ChannelRateCard" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "commissionPercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "fixedFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "partnerId" TEXT NOT NULL,

    CONSTRAINT "ChannelRateCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChannelRateCard_channel_effectiveFrom_idx" ON "ChannelRateCard"("channel", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ChannelRateCard_partnerId_idx" ON "ChannelRateCard"("partnerId");

-- CreateIndex
CREATE INDEX "FreightCharge_orderId_idx" ON "FreightCharge"("orderId");

-- CreateIndex
CREATE INDEX "FreightCharge_chargedAt_idx" ON "FreightCharge"("chargedAt");

-- CreateIndex
CREATE INDEX "Order_settlementDueAt_idx" ON "Order"("settlementDueAt");

-- CreateIndex
CREATE INDEX "Order_paymentMode_deliveryStatus_idx" ON "Order"("paymentMode", "deliveryStatus");

-- CreateIndex
CREATE INDEX "RateCard_partnerId_idx" ON "RateCard"("partnerId");

-- CreateIndex
CREATE INDEX "Settlement_orderId_idx" ON "Settlement"("orderId");

-- CreateIndex
CREATE INDEX "Settlement_settlementDate_idx" ON "Settlement"("settlementDate");

-- AddForeignKey
ALTER TABLE "ChannelRateCard" ADD CONSTRAINT "ChannelRateCard_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

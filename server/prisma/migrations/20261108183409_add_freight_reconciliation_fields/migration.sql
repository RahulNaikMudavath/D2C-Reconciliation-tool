/*
  Warnings:

  - You are about to drop the column `freightChargeId` on the `ReconciliationMatch` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ReconciliationMatch" DROP CONSTRAINT "ReconciliationMatch_freightChargeId_fkey";

-- AlterTable
ALTER TABLE "ReconciliationMatch" DROP COLUMN "freightChargeId",
ADD COLUMN     "actualFreightAmount" DECIMAL(14,2),
ADD COLUMN     "expectedFreightAmount" DECIMAL(14,2),
ADD COLUMN     "freightDifference" DECIMAL(14,2),
ADD COLUMN     "freightStatus" "ReconciliationStatus";

-- CreateTable
CREATE TABLE "_FreightChargeToReconciliationMatch" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FreightChargeToReconciliationMatch_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_FreightChargeToReconciliationMatch_B_index" ON "_FreightChargeToReconciliationMatch"("B");

-- AddForeignKey
ALTER TABLE "_FreightChargeToReconciliationMatch" ADD CONSTRAINT "_FreightChargeToReconciliationMatch_A_fkey" FOREIGN KEY ("A") REFERENCES "FreightCharge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FreightChargeToReconciliationMatch" ADD CONSTRAINT "_FreightChargeToReconciliationMatch_B_fkey" FOREIGN KEY ("B") REFERENCES "ReconciliationMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

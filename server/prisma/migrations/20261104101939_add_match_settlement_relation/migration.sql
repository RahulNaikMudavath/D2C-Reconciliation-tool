/*
  Warnings:

  - You are about to drop the column `settlementId` on the `ReconciliationMatch` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ReconciliationMatch" DROP CONSTRAINT "ReconciliationMatch_settlementId_fkey";

-- AlterTable
ALTER TABLE "ReconciliationMatch" DROP COLUMN "settlementId";

-- CreateTable
CREATE TABLE "MatchSettlement" (
    "id" TEXT NOT NULL,
    "reconciliationMatchId" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,

    CONSTRAINT "MatchSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchSettlement_settlementId_idx" ON "MatchSettlement"("settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSettlement_reconciliationMatchId_settlementId_key" ON "MatchSettlement"("reconciliationMatchId", "settlementId");

-- AddForeignKey
ALTER TABLE "MatchSettlement" ADD CONSTRAINT "MatchSettlement_reconciliationMatchId_fkey" FOREIGN KEY ("reconciliationMatchId") REFERENCES "ReconciliationMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSettlement" ADD CONSTRAINT "MatchSettlement_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

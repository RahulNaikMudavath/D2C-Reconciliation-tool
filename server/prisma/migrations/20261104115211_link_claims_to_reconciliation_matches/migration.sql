-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "matchId" TEXT;

-- CreateIndex
CREATE INDEX "Claim_status_createdAt_idx" ON "Claim"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Claim_partnerId_idx" ON "Claim"("partnerId");

-- CreateIndex
CREATE INDEX "Claim_ownerId_idx" ON "Claim"("ownerId");

-- CreateIndex
CREATE INDEX "Claim_matchId_idx" ON "Claim"("matchId");

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ReconciliationMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

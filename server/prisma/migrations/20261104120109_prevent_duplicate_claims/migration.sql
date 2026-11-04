/*
  Warnings:

  - A unique constraint covering the columns `[matchId]` on the table `Claim` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Claim_matchId_key" ON "Claim"("matchId");

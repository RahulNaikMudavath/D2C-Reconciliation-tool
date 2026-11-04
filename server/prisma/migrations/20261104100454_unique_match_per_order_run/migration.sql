/*
  Warnings:

  - A unique constraint covering the columns `[runId,orderId]` on the table `ReconciliationMatch` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationMatch_runId_orderId_key" ON "ReconciliationMatch"("runId", "orderId");

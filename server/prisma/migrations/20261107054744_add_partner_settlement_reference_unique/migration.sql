/*
  Warnings:

  - A unique constraint covering the columns `[partnerId,referenceNumber]` on the table `Settlement` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Settlement_partnerId_referenceNumber_key" ON "Settlement"("partnerId", "referenceNumber");

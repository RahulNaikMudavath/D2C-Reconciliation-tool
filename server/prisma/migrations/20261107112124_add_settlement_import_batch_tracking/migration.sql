-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "importBatchId" TEXT;

-- CreateIndex
CREATE INDEX "Settlement_importBatchId_idx" ON "Settlement"("importBatchId");

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ReconciliationMatch" ADD COLUMN     "reviewReason" TEXT,
ALTER COLUMN "expectedAmount" DROP NOT NULL,
ALTER COLUMN "difference" DROP NOT NULL;

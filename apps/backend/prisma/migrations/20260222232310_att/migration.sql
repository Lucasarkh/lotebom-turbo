-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "maxInstallments" INTEGER,
ADD COLUMN     "paymentConditionsSummary" TEXT,
ADD COLUMN     "startingPrice" DOUBLE PRECISION;

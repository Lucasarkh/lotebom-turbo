-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "allowIntermediary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "financingDisclaimer" TEXT,
ADD COLUMN     "indexer" TEXT DEFAULT 'IGP-M',
ADD COLUMN     "minDownPaymentPercent" DOUBLE PRECISION DEFAULT 10,
ADD COLUMN     "minDownPaymentValue" DOUBLE PRECISION,
ADD COLUMN     "monthlyInterestRate" DOUBLE PRECISION DEFAULT 0.9,
ALTER COLUMN "maxInstallments" SET DEFAULT 180;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "reservedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "reservationExpiryHours" INTEGER NOT NULL DEFAULT 24;

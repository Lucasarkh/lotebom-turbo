-- AlterTable
ALTER TABLE "SchedulingConfig" ADD COLUMN     "breaks" JSONB,
ADD COLUMN     "lunchEnd" TEXT,
ADD COLUMN     "lunchStart" TEXT;

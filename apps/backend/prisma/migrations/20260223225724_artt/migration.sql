-- AlterTable
ALTER TABLE "LotDetails" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

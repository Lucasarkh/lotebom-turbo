-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "RealtorLink" ADD COLUMN     "creci" TEXT;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrackingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

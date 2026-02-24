-- AlterTable
ALTER TABLE "TrackingSession" ADD COLUMN     "realtorLinkId" TEXT;

-- AddForeignKey
ALTER TABLE "TrackingSession" ADD CONSTRAINT "TrackingSession_realtorLinkId_fkey" FOREIGN KEY ("realtorLinkId") REFERENCES "RealtorLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

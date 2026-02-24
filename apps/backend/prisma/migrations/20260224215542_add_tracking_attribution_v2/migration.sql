-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "ftUtmCampaign" TEXT,
ADD COLUMN     "ftUtmContent" TEXT,
ADD COLUMN     "ftUtmMedium" TEXT,
ADD COLUMN     "ftUtmSource" TEXT,
ADD COLUMN     "ftUtmTerm" TEXT,
ADD COLUMN     "isRecurrent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ltReferrer" TEXT,
ADD COLUMN     "ltUtmCampaign" TEXT,
ADD COLUMN     "ltUtmContent" TEXT,
ADD COLUMN     "ltUtmMedium" TEXT,
ADD COLUMN     "ltUtmSource" TEXT,
ADD COLUMN     "ltUtmTerm" TEXT;

-- AlterTable
ALTER TABLE "TrackingSession" ADD COLUMN     "deviceType" TEXT,
ADD COLUMN     "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ftReferrer" TEXT,
ADD COLUMN     "ftUtmCampaign" TEXT,
ADD COLUMN     "ftUtmContent" TEXT,
ADD COLUMN     "ftUtmMedium" TEXT,
ADD COLUMN     "ftUtmSource" TEXT,
ADD COLUMN     "ftUtmTerm" TEXT,
ADD COLUMN     "ipHash" TEXT,
ADD COLUMN     "landingPage" TEXT,
ADD COLUMN     "lastRealtorAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ltReferrer" TEXT,
ADD COLUMN     "ltUtmCampaign" TEXT,
ADD COLUMN     "ltUtmContent" TEXT,
ADD COLUMN     "ltUtmMedium" TEXT,
ADD COLUMN     "ltUtmSource" TEXT,
ADD COLUMN     "ltUtmTerm" TEXT;

-- CreateIndex
CREATE INDEX "TrackingSession_lastSeenAt_idx" ON "TrackingSession"("lastSeenAt");

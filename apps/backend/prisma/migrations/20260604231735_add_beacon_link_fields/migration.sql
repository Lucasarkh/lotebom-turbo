-- CreateEnum
CREATE TYPE "PanoramaBeaconLinkType" AS ENUM ('NONE', 'LOT', 'PANORAMA', 'URL');

-- AlterTable
ALTER TABLE "PanoramaBeacon" ADD COLUMN     "linkLotId" TEXT,
ADD COLUMN     "linkPanoramaId" TEXT,
ADD COLUMN     "linkType" "PanoramaBeaconLinkType" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "linkUrl" TEXT;

-- AddForeignKey
ALTER TABLE "PanoramaBeacon" ADD CONSTRAINT "PanoramaBeacon_linkLotId_fkey" FOREIGN KEY ("linkLotId") REFERENCES "LotDetails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanoramaBeacon" ADD CONSTRAINT "PanoramaBeacon_linkPanoramaId_fkey" FOREIGN KEY ("linkPanoramaId") REFERENCES "Panorama"("id") ON DELETE SET NULL ON UPDATE CASCADE;

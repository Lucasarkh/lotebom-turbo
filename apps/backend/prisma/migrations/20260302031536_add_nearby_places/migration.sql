-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "nearbyEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nearbyErrorMessage" TEXT,
ADD COLUMN     "nearbyGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "nearbyStatus" TEXT;

-- CreateTable
CREATE TABLE "NearbyItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortAddress" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "distanceMeters" INTEGER NOT NULL,
    "durationSecondsDriving" INTEGER,
    "durationSecondsWalking" INTEGER,
    "distanceLabel" TEXT NOT NULL,
    "drivingLabel" TEXT,
    "walkingLabel" TEXT,
    "routeUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NearbyItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NearbyItem_projectId_idx" ON "NearbyItem"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "NearbyItem_projectId_placeId_key" ON "NearbyItem"("projectId", "placeId");

-- AddForeignKey
ALTER TABLE "NearbyItem" ADD CONSTRAINT "NearbyItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

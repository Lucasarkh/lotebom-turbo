-- CreateTable
CREATE TABLE "Panorama" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Vista Geral',
    "sunPathAngleDeg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sunPathLabelEnabled" BOOLEAN NOT NULL DEFAULT true,
    "showImplantation" BOOLEAN NOT NULL DEFAULT false,
    "implantationUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Panorama_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanoramaSnapshot" (
    "id" TEXT NOT NULL,
    "panoramaId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "label" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanoramaSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanoramaBeacon" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "panoramaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "style" TEXT NOT NULL DEFAULT 'default',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanoramaBeacon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Panorama_tenantId_idx" ON "Panorama"("tenantId");

-- CreateIndex
CREATE INDEX "Panorama_tenantId_projectId_idx" ON "Panorama"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "PanoramaSnapshot_panoramaId_idx" ON "PanoramaSnapshot"("panoramaId");

-- CreateIndex
CREATE INDEX "PanoramaBeacon_panoramaId_idx" ON "PanoramaBeacon"("panoramaId");

-- CreateIndex
CREATE INDEX "PanoramaBeacon_tenantId_idx" ON "PanoramaBeacon"("tenantId");

-- AddForeignKey
ALTER TABLE "Panorama" ADD CONSTRAINT "Panorama_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Panorama" ADD CONSTRAINT "Panorama_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanoramaSnapshot" ADD CONSTRAINT "PanoramaSnapshot_panoramaId_fkey" FOREIGN KEY ("panoramaId") REFERENCES "Panorama"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanoramaBeacon" ADD CONSTRAINT "PanoramaBeacon_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanoramaBeacon" ADD CONSTRAINT "PanoramaBeacon_panoramaId_fkey" FOREIGN KEY ("panoramaId") REFERENCES "Panorama"("id") ON DELETE CASCADE ON UPDATE CASCADE;

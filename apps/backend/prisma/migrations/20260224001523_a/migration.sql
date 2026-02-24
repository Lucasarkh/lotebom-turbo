-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "MapElementType" AS ENUM ('LOT', 'ROAD', 'ROUNDABOUT', 'LAKE', 'GREEN', 'LABEL', 'PATH', 'POLYGON');

-- CreateEnum
CREATE TYPE "GeometryType" AS ENUM ('POLYGON', 'POLYLINE', 'CIRCLE', 'RECT');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD');

-- CreateEnum
CREATE TYPE "SlopeType" AS ENUM ('FLAT', 'UPHILL', 'DOWNHILL');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "PlantHotspotType" AS ENUM ('LOTE', 'PORTARIA', 'QUADRA', 'AREA_COMUM', 'OUTRO');

-- CreateEnum
CREATE TYPE "PlantHotspotLinkType" AS ENUM ('LOTE_PAGE', 'PROJECT_PAGE', 'CUSTOM_URL', 'NONE');

-- CreateEnum
CREATE TYPE "PanoramaProjection" AS ENUM ('FLAT', 'EQUIRECTANGULAR');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "bannerImageUrl" TEXT,
    "mapData" JSONB,
    "highlightsJson" JSONB,
    "locationText" TEXT,
    "address" TEXT,
    "googleMapsUrl" TEXT,
    "showPaymentConditions" BOOLEAN NOT NULL DEFAULT false,
    "startingPrice" DOUBLE PRECISION,
    "maxInstallments" INTEGER,
    "paymentConditionsSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapElement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "MapElementType" NOT NULL,
    "name" TEXT,
    "code" TEXT,
    "geometryType" "GeometryType" NOT NULL,
    "geometryJson" JSONB NOT NULL,
    "styleJson" JSONB,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotDetails" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "mapElementId" TEXT NOT NULL,
    "status" "LotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "price" DOUBLE PRECISION,
    "areaM2" DOUBLE PRECISION,
    "frontage" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,
    "sideLeft" DOUBLE PRECISION,
    "sideRight" DOUBLE PRECISION,
    "slope" "SlopeType" NOT NULL DEFAULT 'FLAT',
    "conditionsJson" JSONB,
    "sideMetricsJson" JSONB,
    "paymentConditions" JSONB,
    "panoramaUrl" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LotDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMedia" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lotDetailsId" TEXT,
    "type" "MediaType" NOT NULL DEFAULT 'PHOTO',
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "mapElementId" TEXT,
    "realtorLinkId" TEXT,
    "sessionId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT,
    "source" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "lastContactAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealtorLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "creci" TEXT,
    "photoUrl" TEXT,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RealtorLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Panorama" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Vista Geral',
    "projection" "PanoramaProjection" NOT NULL DEFAULT 'FLAT',
    "published" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE "PlantMap" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "sunPathEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sunPathAngleDeg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sunPathLabelEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantHotspot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plantMapId" TEXT NOT NULL,
    "type" "PlantHotspotType" NOT NULL DEFAULT 'OUTRO',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "labelEnabled" BOOLEAN NOT NULL DEFAULT true,
    "labelOffsetX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "labelOffsetY" DOUBLE PRECISION NOT NULL DEFAULT -24,
    "linkType" "PlantHotspotLinkType" NOT NULL DEFAULT 'NONE',
    "linkId" TEXT,
    "linkUrl" TEXT,
    "loteStatus" "LotStatus",
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantHotspot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "projectId" TEXT,
    "userId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "action" TEXT,
    "label" TEXT,
    "value" DOUBLE PRECISION,
    "metadata" JSONB,
    "path" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "utmSource" TEXT NOT NULL,
    "utmMedium" TEXT,
    "utmCampaign" TEXT NOT NULL,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "budget" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignInvestment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignInvestment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProjectToRealtorLink" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectToRealtorLink_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "Project_tenantId_idx" ON "Project"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "MapElement_tenantId_projectId_code_idx" ON "MapElement"("tenantId", "projectId", "code");

-- CreateIndex
CREATE INDEX "MapElement_tenantId_projectId_idx" ON "MapElement"("tenantId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "LotDetails_mapElementId_key" ON "LotDetails"("mapElementId");

-- CreateIndex
CREATE INDEX "LotDetails_tenantId_projectId_idx" ON "LotDetails"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "LotDetails_status_idx" ON "LotDetails"("status");

-- CreateIndex
CREATE INDEX "ProjectMedia_tenantId_projectId_idx" ON "ProjectMedia"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "ProjectMedia_lotDetailsId_idx" ON "ProjectMedia"("lotDetailsId");

-- CreateIndex
CREATE INDEX "Lead_tenantId_projectId_idx" ON "Lead"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "RealtorLink_tenantId_idx" ON "RealtorLink"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "RealtorLink_tenantId_code_key" ON "RealtorLink"("tenantId", "code");

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

-- CreateIndex
CREATE UNIQUE INDEX "PlantMap_projectId_key" ON "PlantMap"("projectId");

-- CreateIndex
CREATE INDEX "PlantMap_tenantId_idx" ON "PlantMap"("tenantId");

-- CreateIndex
CREATE INDEX "PlantHotspot_plantMapId_idx" ON "PlantHotspot"("plantMapId");

-- CreateIndex
CREATE INDEX "PlantHotspot_tenantId_idx" ON "PlantHotspot"("tenantId");

-- CreateIndex
CREATE INDEX "TrackingSession_tenantId_projectId_idx" ON "TrackingSession"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "TrackingSession_createdAt_idx" ON "TrackingSession"("createdAt");

-- CreateIndex
CREATE INDEX "TrackingEvent_sessionId_idx" ON "TrackingEvent"("sessionId");

-- CreateIndex
CREATE INDEX "TrackingEvent_type_category_idx" ON "TrackingEvent"("type", "category");

-- CreateIndex
CREATE INDEX "TrackingEvent_timestamp_idx" ON "TrackingEvent"("timestamp");

-- CreateIndex
CREATE INDEX "Campaign_tenantId_idx" ON "Campaign"("tenantId");

-- CreateIndex
CREATE INDEX "Campaign_projectId_idx" ON "Campaign"("projectId");

-- CreateIndex
CREATE INDEX "CampaignInvestment_campaignId_idx" ON "CampaignInvestment"("campaignId");

-- CreateIndex
CREATE INDEX "_ProjectToRealtorLink_B_index" ON "_ProjectToRealtorLink"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapElement" ADD CONSTRAINT "MapElement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapElement" ADD CONSTRAINT "MapElement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotDetails" ADD CONSTRAINT "LotDetails_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotDetails" ADD CONSTRAINT "LotDetails_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotDetails" ADD CONSTRAINT "LotDetails_mapElementId_fkey" FOREIGN KEY ("mapElementId") REFERENCES "MapElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMedia" ADD CONSTRAINT "ProjectMedia_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMedia" ADD CONSTRAINT "ProjectMedia_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMedia" ADD CONSTRAINT "ProjectMedia_lotDetailsId_fkey" FOREIGN KEY ("lotDetailsId") REFERENCES "LotDetails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_mapElementId_fkey" FOREIGN KEY ("mapElementId") REFERENCES "MapElement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_realtorLinkId_fkey" FOREIGN KEY ("realtorLinkId") REFERENCES "RealtorLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrackingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealtorLink" ADD CONSTRAINT "RealtorLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "PlantMap" ADD CONSTRAINT "PlantMap_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantMap" ADD CONSTRAINT "PlantMap_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantHotspot" ADD CONSTRAINT "PlantHotspot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantHotspot" ADD CONSTRAINT "PlantHotspot_plantMapId_fkey" FOREIGN KEY ("plantMapId") REFERENCES "PlantMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingSession" ADD CONSTRAINT "TrackingSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingSession" ADD CONSTRAINT "TrackingSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrackingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignInvestment" ADD CONSTRAINT "CampaignInvestment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToRealtorLink" ADD CONSTRAINT "_ProjectToRealtorLink_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToRealtorLink" ADD CONSTRAINT "_ProjectToRealtorLink_B_fkey" FOREIGN KEY ("B") REFERENCES "RealtorLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

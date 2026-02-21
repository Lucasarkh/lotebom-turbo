-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadStatus" ADD VALUE 'QUALIFIED';
ALTER TYPE "LeadStatus" ADD VALUE 'NEGOTIATING';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "realtorLinkId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "highlightsJson" JSONB,
ADD COLUMN     "locationText" TEXT;

-- CreateTable
CREATE TABLE "RealtorLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "photoUrl" TEXT,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RealtorLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RealtorLink_tenantId_idx" ON "RealtorLink"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "RealtorLink_tenantId_code_key" ON "RealtorLink"("tenantId", "code");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_realtorLinkId_fkey" FOREIGN KEY ("realtorLinkId") REFERENCES "RealtorLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealtorLink" ADD CONSTRAINT "RealtorLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealtorLink" ADD CONSTRAINT "RealtorLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

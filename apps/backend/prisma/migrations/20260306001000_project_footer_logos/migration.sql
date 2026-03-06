-- CreateTable
CREATE TABLE "ProjectLogo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectLogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectLogo_tenantId_projectId_idx" ON "ProjectLogo"("tenantId", "projectId");

-- AddForeignKey
ALTER TABLE "ProjectLogo" ADD CONSTRAINT "ProjectLogo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLogo" ADD CONSTRAINT "ProjectLogo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

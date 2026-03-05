-- CreateTable
CREATE TABLE "TenantInviteCode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CORRETOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantInviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantInviteCode_code_key" ON "TenantInviteCode"("code");

-- CreateIndex
CREATE INDEX "TenantInviteCode_tenantId_idx" ON "TenantInviteCode"("tenantId");

-- CreateIndex
CREATE INDEX "TenantInviteCode_code_idx" ON "TenantInviteCode"("code");

-- AddForeignKey
ALTER TABLE "TenantInviteCode" ADD CONSTRAINT "TenantInviteCode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

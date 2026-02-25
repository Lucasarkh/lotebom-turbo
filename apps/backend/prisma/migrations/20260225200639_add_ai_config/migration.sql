-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "aiConfigId" TEXT,
ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AiConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "apiKey" TEXT,
    "systemPrompt" TEXT,
    "temperature" DOUBLE PRECISION DEFAULT 0.7,
    "maxTokens" INTEGER DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiConfig_tenantId_idx" ON "AiConfig"("tenantId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_aiConfigId_fkey" FOREIGN KEY ("aiConfigId") REFERENCES "AiConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConfig" ADD CONSTRAINT "AiConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

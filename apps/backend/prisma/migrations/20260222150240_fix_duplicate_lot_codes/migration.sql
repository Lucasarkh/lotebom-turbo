-- DropIndex
DROP INDEX "MapElement_tenantId_projectId_code_key";

-- CreateIndex
CREATE INDEX "MapElement_tenantId_projectId_code_idx" ON "MapElement"("tenantId", "projectId", "code");

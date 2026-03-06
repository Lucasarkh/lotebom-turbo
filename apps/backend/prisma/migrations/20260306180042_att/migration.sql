-- DropIndex
DROP INDEX "MapElement_tenantId_projectId_idx";

-- DropIndex
DROP INDEX "Panorama_tenantId_idx";

-- DropIndex
DROP INDEX "SupportTicket_status_idx";

-- DropIndex
DROP INDEX "TrackingSession_createdAt_idx";

-- DropIndex
DROP INDEX "TrackingSession_lastSeenAt_idx";

-- CreateIndex
CREATE INDEX "BillingInvoice_tenantId_status_idx" ON "BillingInvoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Invite_expiresAt_idx" ON "Invite"("expiresAt");

-- CreateIndex
CREATE INDEX "Lead_tenantId_status_idx" ON "Lead"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Lead_tenantId_projectId_status_idx" ON "Lead"("tenantId", "projectId", "status");

-- CreateIndex
CREATE INDEX "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt");

-- CreateIndex
CREATE INDEX "Scheduling_leadId_idx" ON "Scheduling"("leadId");

-- CreateIndex
CREATE INDEX "Scheduling_userId_idx" ON "Scheduling"("userId");

-- CreateIndex
CREATE INDEX "SupportTicket_tenantId_status_createdAt_idx" ON "SupportTicket"("tenantId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SystemLead_status_idx" ON "SystemLead"("status");

-- CreateIndex
CREATE INDEX "SystemLead_email_idx" ON "SystemLead"("email");

-- CreateIndex
CREATE INDEX "TrackingSession_realtorLinkId_idx" ON "TrackingSession"("realtorLinkId");

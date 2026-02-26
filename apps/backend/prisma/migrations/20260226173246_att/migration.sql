-- CreateIndex
CREATE INDEX "Project_slug_idx" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "TrackingEvent_type_timestamp_idx" ON "TrackingEvent"("type", "timestamp");

-- CreateIndex
CREATE INDEX "TrackingSession_tenantId_createdAt_idx" ON "TrackingSession"("tenantId", "createdAt");

/*
  Warnings:

  - You are about to alter the column `budget` on the `Campaign` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `amount` on the `CampaignInvestment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `amount` on the `LeadPayment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `price` on the `LotDetails` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `startingPrice` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `reservationFeeValue` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `minDownPaymentPercent` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - You are about to alter the column `minDownPaymentValue` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `monthlyInterestRate` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,4)`.

*/
-- DropIndex
DROP INDEX "Lead_status_idx";

-- DropIndex
DROP INDEX "TrackingEvent_sessionId_idx";

-- DropIndex
DROP INDEX "TrackingEvent_type_category_idx";

-- AlterTable
ALTER TABLE "Campaign" ALTER COLUMN "budget" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "CampaignInvestment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LeadPayment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "LotDetails" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "price" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "startingPrice" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "reservationFeeValue" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "minDownPaymentPercent" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "minDownPaymentValue" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "monthlyInterestRate" SET DATA TYPE DECIMAL(5,4);

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_cpf_idx" ON "Lead"("cpf");

-- CreateIndex
CREATE INDEX "Lead_sessionId_idx" ON "Lead"("sessionId");

-- CreateIndex
CREATE INDEX "Lead_realtorLinkId_idx" ON "Lead"("realtorLinkId");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "TrackingEvent_sessionId_timestamp_idx" ON "TrackingEvent"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "TrackingEvent_type_category_timestamp_idx" ON "TrackingEvent"("type", "category", "timestamp");

-- CreateIndex
CREATE INDEX "TrackingSession_projectId_lastSeenAt_idx" ON "TrackingSession"("projectId", "lastSeenAt");

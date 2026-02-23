-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "budget" DOUBLE PRECISION;

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

-- CreateIndex
CREATE INDEX "CampaignInvestment_campaignId_idx" ON "CampaignInvestment"("campaignId");

-- AddForeignKey
ALTER TABLE "CampaignInvestment" ADD CONSTRAINT "CampaignInvestment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

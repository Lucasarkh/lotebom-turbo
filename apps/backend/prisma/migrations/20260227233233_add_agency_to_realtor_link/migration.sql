-- AlterTable
ALTER TABLE "RealtorLink" ADD COLUMN     "agencyId" TEXT;

-- AddForeignKey
ALTER TABLE "RealtorLink" ADD CONSTRAINT "RealtorLink_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

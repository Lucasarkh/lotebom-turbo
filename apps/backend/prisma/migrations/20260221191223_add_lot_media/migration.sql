-- AlterTable
ALTER TABLE "ProjectMedia" ADD COLUMN     "lotDetailsId" TEXT;

-- CreateIndex
CREATE INDEX "ProjectMedia_lotDetailsId_idx" ON "ProjectMedia"("lotDetailsId");

-- AddForeignKey
ALTER TABLE "ProjectMedia" ADD CONSTRAINT "ProjectMedia_lotDetailsId_fkey" FOREIGN KEY ("lotDetailsId") REFERENCES "LotDetails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

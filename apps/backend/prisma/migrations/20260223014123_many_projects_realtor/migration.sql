/*
  Warnings:

  - You are about to drop the column `projectId` on the `RealtorLink` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "RealtorLink" DROP CONSTRAINT "RealtorLink_projectId_fkey";

-- AlterTable
ALTER TABLE "RealtorLink" DROP COLUMN "projectId";

-- CreateTable
CREATE TABLE "_ProjectToRealtorLink" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectToRealtorLink_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProjectToRealtorLink_B_index" ON "_ProjectToRealtorLink"("B");

-- AddForeignKey
ALTER TABLE "_ProjectToRealtorLink" ADD CONSTRAINT "_ProjectToRealtorLink_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToRealtorLink" ADD CONSTRAINT "_ProjectToRealtorLink_B_fkey" FOREIGN KEY ("B") REFERENCES "RealtorLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

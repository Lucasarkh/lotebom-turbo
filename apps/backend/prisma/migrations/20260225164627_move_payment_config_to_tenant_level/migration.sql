/*
  Warnings:

  - You are about to drop the column `projectId` on the `PaymentConfig` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "PaymentConfig" DROP CONSTRAINT "PaymentConfig_projectId_fkey";

-- DropIndex
DROP INDEX "PaymentConfig_projectId_key";

-- AlterTable
ALTER TABLE "PaymentConfig" DROP COLUMN "projectId",
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Gateway Principal';

-- CreateTable
CREATE TABLE "_ProjectGateways" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectGateways_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProjectGateways_B_index" ON "_ProjectGateways"("B");

-- AddForeignKey
ALTER TABLE "_ProjectGateways" ADD CONSTRAINT "_ProjectGateways_A_fkey" FOREIGN KEY ("A") REFERENCES "PaymentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectGateways" ADD CONSTRAINT "_ProjectGateways_B_fkey" FOREIGN KEY ("B") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

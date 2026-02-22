-- CreateEnum
CREATE TYPE "PanoramaProjection" AS ENUM ('FLAT', 'EQUIRECTANGULAR');

-- AlterTable
ALTER TABLE "Panorama" ADD COLUMN     "projection" "PanoramaProjection" NOT NULL DEFAULT 'FLAT';

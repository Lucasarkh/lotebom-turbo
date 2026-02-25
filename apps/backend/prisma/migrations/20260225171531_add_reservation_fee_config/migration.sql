-- CreateEnum
CREATE TYPE "ReservationFeeType" AS ENUM ('FIXED', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "reservationFeeType" "ReservationFeeType" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "reservationFeeValue" DOUBLE PRECISION NOT NULL DEFAULT 500;

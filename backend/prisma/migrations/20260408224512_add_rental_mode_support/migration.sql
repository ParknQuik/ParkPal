-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "auth_amount" DOUBLE PRECISION,
ADD COLUMN     "auth_id" TEXT,
ADD COLUMN     "max_duration" INTEGER,
ADD COLUMN     "rental_mode" TEXT NOT NULL DEFAULT 'fixed',
ALTER COLUMN "end_time" DROP NOT NULL;

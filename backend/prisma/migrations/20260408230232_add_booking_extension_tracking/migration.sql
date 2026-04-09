-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "original_end_time" TIMESTAMP(3),
ADD COLUMN     "extension_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_extension_hrs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_extended_at" TIMESTAMP(3);

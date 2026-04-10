-- CreateMigration
-- Migration for adding title field to ParkingSlot model

ALTER TABLE "parking_slots" ADD COLUMN "title" TEXT;
-- AlterTable
ALTER TABLE "users" ADD COLUMN "no_show_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "late_cancel_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "suspended_until" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "last_strike_at" TIMESTAMP(3);

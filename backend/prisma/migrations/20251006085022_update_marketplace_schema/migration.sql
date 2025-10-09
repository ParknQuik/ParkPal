/*
  Warnings:

  - You are about to drop the column `price_per_hour` on the `parking_slots` table. All the data in the column will be lost.
  - Added the required column `address` to the `parking_slots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `parking_slots` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "bookings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slot_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "price" REAL NOT NULL,
    "platform_fee" REAL NOT NULL DEFAULT 0,
    "host_earnings" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "cancelled_at" DATETIME,
    "cancellation_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "parking_slots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "host_id" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "payment_method" TEXT,
    "account_details" TEXT,
    "processed_at" DATETIME,
    "transaction_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "payouts_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_parking_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "zone_id" INTEGER,
    "slot_id" INTEGER,
    "session_type" TEXT NOT NULL,
    "check_in_time" DATETIME,
    "check_out_time" DATETIME,
    "duration_minutes" INTEGER,
    "zone_entry_time" DATETIME,
    "circling_start_time" DATETIME,
    "parking_confirmation_time" DATETIME,
    "circling_end_time" DATETIME,
    "exit_time" DATETIME,
    "circling_duration_seconds" INTEGER,
    "last_activity_status" TEXT,
    "activity_confidence_level" INTEGER,
    "total_amount" REAL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "parking_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "parking_sessions_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "parking_sessions_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "parking_slots" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_parking_sessions" ("activity_confidence_level", "circling_duration_seconds", "circling_end_time", "circling_start_time", "created_at", "exit_time", "id", "last_activity_status", "parking_confirmation_time", "session_type", "slot_id", "status", "total_amount", "updated_at", "user_id", "zone_entry_time", "zone_id") SELECT "activity_confidence_level", "circling_duration_seconds", "circling_end_time", "circling_start_time", "created_at", "exit_time", "id", "last_activity_status", "parking_confirmation_time", "session_type", "slot_id", "status", "total_amount", "updated_at", "user_id", "zone_entry_time", "zone_id" FROM "parking_sessions";
DROP TABLE "parking_sessions";
ALTER TABLE "new_parking_sessions" RENAME TO "parking_sessions";
CREATE TABLE "new_parking_slots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zone_id" INTEGER,
    "slot_number" TEXT,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "address" TEXT NOT NULL,
    "floor" TEXT,
    "section" TEXT,
    "slot_type" TEXT NOT NULL,
    "sensor_id" TEXT,
    "qr_code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "price" REAL NOT NULL,
    "description" TEXT,
    "amenities" TEXT,
    "photos" TEXT,
    "rating" REAL NOT NULL DEFAULT 0,
    "owner_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "parking_slots_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "parking_slots_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_parking_slots" ("created_at", "floor", "id", "is_active", "lat", "lon", "owner_id", "qr_code", "section", "sensor_id", "slot_number", "slot_type", "status", "updated_at", "zone_id") SELECT "created_at", "floor", "id", "is_active", "lat", "lon", "owner_id", "qr_code", "section", "sensor_id", "slot_number", "slot_type", "status", "updated_at", "zone_id" FROM "parking_slots";
DROP TABLE "parking_slots";
ALTER TABLE "new_parking_slots" RENAME TO "parking_slots";
CREATE UNIQUE INDEX "parking_slots_sensor_id_key" ON "parking_slots"("sensor_id");
CREATE UNIQUE INDEX "parking_slots_qr_code_key" ON "parking_slots"("qr_code");
CREATE TABLE "new_payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "session_id" INTEGER,
    "booking_id" INTEGER,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "payment_method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transaction_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "parking_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("amount", "created_at", "currency", "id", "payment_method", "session_id", "status", "transaction_id", "updated_at", "user_id") SELECT "amount", "created_at", "currency", "id", "payment_method", "session_id", "status", "transaction_id", "updated_at", "user_id" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");
CREATE TABLE "new_reviews" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "author_id" INTEGER NOT NULL,
    "target_id" INTEGER,
    "slot_id" INTEGER,
    "booking_id" INTEGER,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reviews_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "reviews_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "parking_slots" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_reviews" ("author_id", "comment", "created_at", "id", "rating", "target_id", "updated_at") SELECT "author_id", "comment", "created_at", "id", "rating", "target_id", "updated_at" FROM "reviews";
DROP TABLE "reviews";
ALTER TABLE "new_reviews" RENAME TO "reviews";
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "payouts_transaction_id_key" ON "payouts"("transaction_id");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_parking_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "zone_id" INTEGER,
    "slot_id" INTEGER,
    "booking_id" INTEGER,
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
    CONSTRAINT "parking_sessions_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "parking_slots" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "parking_sessions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_parking_sessions" ("activity_confidence_level", "check_in_time", "check_out_time", "circling_duration_seconds", "circling_end_time", "circling_start_time", "created_at", "duration_minutes", "exit_time", "id", "last_activity_status", "parking_confirmation_time", "session_type", "slot_id", "status", "total_amount", "updated_at", "user_id", "zone_entry_time", "zone_id") SELECT "activity_confidence_level", "check_in_time", "check_out_time", "circling_duration_seconds", "circling_end_time", "circling_start_time", "created_at", "duration_minutes", "exit_time", "id", "last_activity_status", "parking_confirmation_time", "session_type", "slot_id", "status", "total_amount", "updated_at", "user_id", "zone_entry_time", "zone_id" FROM "parking_sessions";
DROP TABLE "parking_sessions";
ALTER TABLE "new_parking_sessions" RENAME TO "parking_sessions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

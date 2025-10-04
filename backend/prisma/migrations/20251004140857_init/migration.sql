-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "slots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "address" TEXT,
    "owner_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "slots_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slot_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "price" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "slots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

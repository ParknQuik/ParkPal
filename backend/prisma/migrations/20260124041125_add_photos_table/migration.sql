-- DropIndex
DROP INDEX "users_reset_password_token_idx";

-- CreateTable
CREATE TABLE "photos" (
    "id" SERIAL NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "original_url" TEXT NOT NULL,
    "large_url" TEXT NOT NULL,
    "medium_url" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photos_slot_id_idx" ON "photos"("slot_id");

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "parking_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

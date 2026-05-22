-- AlterTable
ALTER TABLE "users" ADD COLUMN "reset_password_token" TEXT,
ADD COLUMN "reset_password_expires" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_reset_password_token_idx" ON "users"("reset_password_token");

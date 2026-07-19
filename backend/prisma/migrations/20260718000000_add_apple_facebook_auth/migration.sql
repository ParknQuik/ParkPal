ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "apple_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "facebook_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_apple_id_key" ON "users"("apple_id");
CREATE UNIQUE INDEX IF NOT EXISTS "users_facebook_id_key" ON "users"("facebook_id");

ALTER TABLE "users"
ADD COLUMN "can_host" BOOLEAN NOT NULL DEFAULT false;

UPDATE "users" AS u
SET "can_host" = true
WHERE u."role" = 'host'
   OR EXISTS (
     SELECT 1
     FROM "parking_slots" AS ps
     WHERE ps."owner_id" = u."id"
   );

ALTER TABLE "payments"
  ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'booking',
  ADD COLUMN "extension_hours" INTEGER;

WITH ranked_active_payments AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "booking_id", "purpose" ORDER BY "created_at" DESC, "id" DESC
  ) AS position
  FROM "payments"
  WHERE "booking_id" IS NOT NULL AND "status" IN ('pending', 'processing', 'authorized')
)
UPDATE "payments" AS payment
SET "status" = 'failed'
FROM ranked_active_payments AS ranked
WHERE payment."id" = ranked."id" AND ranked.position > 1;

CREATE UNIQUE INDEX "payments_one_active_per_booking_purpose"
  ON "payments" ("booking_id", "purpose")
  WHERE "booking_id" IS NOT NULL AND "status" IN ('pending', 'processing', 'authorized');

ALTER TABLE "payments"
  ADD COLUMN "captured_parking_amount" DOUBLE PRECISION,
  ADD COLUMN "platform_fee_amount" DOUBLE PRECISION;

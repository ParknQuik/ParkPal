ALTER TABLE "bookings" ADD COLUMN "vehicle_id" INTEGER;

CREATE INDEX "bookings_vehicle_id_idx" ON "bookings"("vehicle_id");

ALTER TABLE "bookings"
ADD CONSTRAINT "bookings_vehicle_id_fkey"
FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

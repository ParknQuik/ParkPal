-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_slot_id_idx" ON "bookings"("slot_id");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_start_time_end_time_idx" ON "bookings"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "bookings_created_at_idx" ON "bookings"("created_at");

-- CreateIndex
CREATE INDEX "parking_sessions_user_id_idx" ON "parking_sessions"("user_id");

-- CreateIndex
CREATE INDEX "parking_sessions_slot_id_idx" ON "parking_sessions"("slot_id");

-- CreateIndex
CREATE INDEX "parking_sessions_zone_id_idx" ON "parking_sessions"("zone_id");

-- CreateIndex
CREATE INDEX "parking_sessions_status_idx" ON "parking_sessions"("status");

-- CreateIndex
CREATE INDEX "parking_sessions_check_in_time_idx" ON "parking_sessions"("check_in_time");

-- CreateIndex
CREATE INDEX "parking_sessions_created_at_idx" ON "parking_sessions"("created_at");

-- CreateIndex
CREATE INDEX "parking_slots_lat_lon_idx" ON "parking_slots"("lat", "lon");

-- CreateIndex
CREATE INDEX "parking_slots_is_active_status_idx" ON "parking_slots"("is_active", "status");

-- CreateIndex
CREATE INDEX "parking_slots_owner_id_idx" ON "parking_slots"("owner_id");

-- CreateIndex
CREATE INDEX "parking_slots_created_at_idx" ON "parking_slots"("created_at");

-- CreateIndex
CREATE INDEX "parking_slots_price_idx" ON "parking_slots"("price");

-- CreateIndex
CREATE INDEX "parking_slots_zone_id_idx" ON "parking_slots"("zone_id");

-- CreateIndex
CREATE INDEX "reviews_slot_id_idx" ON "reviews"("slot_id");

-- CreateIndex
CREATE INDEX "reviews_author_id_idx" ON "reviews"("author_id");

-- CreateIndex
CREATE INDEX "reviews_created_at_idx" ON "reviews"("created_at");

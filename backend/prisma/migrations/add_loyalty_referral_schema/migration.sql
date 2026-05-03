-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "google_id" TEXT,
    "profile_image_url" TEXT,
    "push_token" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "points_balance" INTEGER NOT NULL DEFAULT 0,
    "referral_code" TEXT,
    "reset_password_token" TEXT,
    "reset_password_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "geofence_polygon" TEXT NOT NULL,
    "center_lat" DOUBLE PRECISION NOT NULL,
    "center_lon" DOUBLE PRECISION NOT NULL,
    "radius_meters" DOUBLE PRECISION,
    "total_capacity" INTEGER NOT NULL DEFAULT 0,
    "price_per_hour" DOUBLE PRECISION,
    "operating_hours" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_slots" (
    "id" SERIAL NOT NULL,
    "zone_id" INTEGER,
    "slot_number" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "title" TEXT,
    "floor" TEXT,
    "section" TEXT,
    "slot_type" TEXT NOT NULL,
    "sensor_id" TEXT,
    "qr_code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "amenities" TEXT,
    "photos" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "owner_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_slots_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "parking_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "zone_id" INTEGER,
    "slot_id" INTEGER,
    "booking_id" INTEGER,
    "session_type" TEXT NOT NULL,
    "check_in_time" TIMESTAMP(3),
    "check_out_time" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "zone_entry_time" TIMESTAMP(3),
    "circling_start_time" TIMESTAMP(3),
    "parking_confirmation_time" TIMESTAMP(3),
    "circling_end_time" TIMESTAMP(3),
    "exit_time" TIMESTAMP(3),
    "circling_duration_seconds" INTEGER,
    "last_activity_status" TEXT,
    "activity_confidence_level" INTEGER,
    "total_amount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_events" (
    "id" SERIAL NOT NULL,
    "sensor_id" TEXT NOT NULL,
    "zone_id" INTEGER,
    "slot_id" INTEGER,
    "event_type" TEXT NOT NULL,
    "event_data" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "session_id" INTEGER,
    "activity_type" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone_metrics" (
    "id" SERIAL NOT NULL,
    "zone_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "period_type" TEXT NOT NULL,
    "total_slots" INTEGER NOT NULL,
    "occupied_slots" INTEGER NOT NULL,
    "available_slots" INTEGER NOT NULL,
    "occupancy_percentage" DOUBLE PRECISION NOT NULL,
    "avg_circling_time_seconds" INTEGER,
    "min_circling_time_seconds" INTEGER,
    "max_circling_time_seconds" INTEGER,
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zone_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "rental_mode" TEXT NOT NULL DEFAULT 'fixed',
    "max_duration" INTEGER,
    "auth_amount" DOUBLE PRECISION,
    "auth_id" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "platform_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "host_earnings" DOUBLE PRECISION NOT NULL,
    "original_end_time" TIMESTAMP(3),
    "extension_count" INTEGER NOT NULL DEFAULT 0,
    "total_extension_hrs" INTEGER NOT NULL DEFAULT 0,
    "last_extended_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" SERIAL NOT NULL,
    "host_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "payment_method" TEXT,
    "account_details" TEXT,
    "processed_at" TIMESTAMP(3),
    "transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "session_id" INTEGER,
    "booking_id" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "payment_method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "author_id" INTEGER NOT NULL,
    "target_id" INTEGER,
    "slot_id" INTEGER,
    "booking_id" INTEGER,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "color" TEXT,
    "license_plate" TEXT NOT NULL,
    "image_url" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_transactions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "reference_id" INTEGER,
    "reference_type" TEXT,
    "description" TEXT,
    "expires_at" TIMESTAMP(3),
    "is_expired" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "points_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" SERIAL NOT NULL,
    "referrer_id" INTEGER NOT NULL,
    "referred_id" INTEGER NOT NULL,
    "referral_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reward_amount" INTEGER,
    "reward_given_at" TIMESTAMP(3),
    "reward_transaction_id" INTEGER,
    "first_booking_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "parking_slots_sensor_id_key" ON "parking_slots"("sensor_id");

-- CreateIndex
CREATE UNIQUE INDEX "parking_slots_qr_code_key" ON "parking_slots"("qr_code");

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
CREATE INDEX "photos_slot_id_idx" ON "photos"("slot_id");

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
CREATE UNIQUE INDEX "payouts_transaction_id_key" ON "payouts"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "reviews_slot_id_idx" ON "reviews"("slot_id");

-- CreateIndex
CREATE INDEX "reviews_author_id_idx" ON "reviews"("author_id");

-- CreateIndex
CREATE INDEX "reviews_created_at_idx" ON "reviews"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_license_plate_key" ON "vehicles"("license_plate");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "points_transactions_user_id_idx" ON "points_transactions"("user_id");

-- CreateIndex
CREATE INDEX "points_transactions_expires_at_idx" ON "points_transactions"("expires_at");

-- CreateIndex
CREATE INDEX "points_transactions_type_idx" ON "points_transactions"("type");

-- CreateIndex
CREATE INDEX "points_transactions_status_idx" ON "points_transactions"("status");

-- CreateIndex
CREATE INDEX "points_transactions_created_at_idx" ON "points_transactions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_reward_transaction_id_key" ON "referrals"("reward_transaction_id");

-- CreateIndex
CREATE INDEX "referrals_referrer_id_idx" ON "referrals"("referrer_id");

-- CreateIndex
CREATE INDEX "referrals_referred_id_idx" ON "referrals"("referred_id");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE INDEX "referrals_expires_at_idx" ON "referrals"("expires_at");

-- CreateIndex
CREATE INDEX "referrals_created_at_idx" ON "referrals"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referred_id_key" ON "referrals"("referred_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referral_code_key" ON "referrals"("referral_code");

-- AddForeignKey
ALTER TABLE "parking_slots" ADD CONSTRAINT "parking_slots_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_slots" ADD CONSTRAINT "parking_slots_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "parking_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "parking_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_events" ADD CONSTRAINT "sensor_events_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_events" ADD CONSTRAINT "sensor_events_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "parking_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "parking_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_metrics" ADD CONSTRAINT "zone_metrics_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "parking_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "parking_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "parking_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_reward_transaction_id_fkey" FOREIGN KEY ("reward_transaction_id") REFERENCES "points_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "parking_partners" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "api_key_hash" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "parking_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regional_parking_facilities" (
    "id" SERIAL NOT NULL,
    "region_code" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "capacity" INTEGER,
    "access" TEXT,
    "source_updated_at" TIMESTAMP(3),
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "partner_id" INTEGER,
    "partner_updated_at" TIMESTAMP(3),
    "available_count" INTEGER,
    "occupied_count" INTEGER,
    CONSTRAINT "regional_parking_facilities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "regional_parking_counts_check" CHECK ((available_count IS NULL OR available_count >= 0) AND (occupied_count IS NULL OR occupied_count >= 0))
);

-- CreateIndex
CREATE UNIQUE INDEX "parking_partners_api_key_hash_key" ON "parking_partners"("api_key_hash");

-- CreateIndex
CREATE INDEX "regional_parking_facilities_region_code_is_active_idx" ON "regional_parking_facilities"("region_code", "is_active");

-- CreateIndex
CREATE INDEX "regional_parking_facilities_partner_id_partner_updated_at_idx" ON "regional_parking_facilities"("partner_id", "partner_updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "regional_parking_facilities_source_source_id_key" ON "regional_parking_facilities"("source", "source_id");

-- AddForeignKey
ALTER TABLE "regional_parking_facilities" ADD CONSTRAINT "regional_parking_facilities_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "parking_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

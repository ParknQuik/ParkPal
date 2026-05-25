-- CreateEnum
CREATE TYPE "ParkingCandidateStatus" AS ENUM ('candidate_preview', 'geofence_verified', 'commercial_verified', 'rejected');

-- CreateEnum
CREATE TYPE "ParkingCandidateScanRunStatus" AS ENUM ('running', 'completed', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "parking_candidates" (
    "id" SERIAL NOT NULL,
    "google_place_id" TEXT NOT NULL,
    "candidate_status" "ParkingCandidateStatus" NOT NULL DEFAULT 'candidate_preview',
    "scan_area" TEXT NOT NULL,
    "scan_source" TEXT NOT NULL,
    "scan_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "draft_center_lat" DOUBLE PRECISION,
    "draft_center_lon" DOUBLE PRECISION,
    "draft_radius_meters" DOUBLE PRECISION,
    "draft_geofence_polygon" TEXT,
    "linked_zone_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_candidate_scan_runs" (
    "id" SERIAL NOT NULL,
    "scan_source" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" "ParkingCandidateScanRunStatus" NOT NULL DEFAULT 'running',
    "scan_point_count" INTEGER NOT NULL DEFAULT 0,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "error_summary" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_candidate_scan_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parking_candidates_google_place_id_key" ON "parking_candidates"("google_place_id");

-- CreateIndex
CREATE INDEX "parking_candidates_google_place_id_idx" ON "parking_candidates"("google_place_id");

-- CreateIndex
CREATE INDEX "parking_candidates_candidate_status_idx" ON "parking_candidates"("candidate_status");

-- CreateIndex
CREATE INDEX "parking_candidates_created_at_idx" ON "parking_candidates"("created_at");

-- CreateIndex
CREATE INDEX "parking_candidate_scan_runs_scan_source_idx" ON "parking_candidate_scan_runs"("scan_source");

-- CreateIndex
CREATE INDEX "parking_candidate_scan_runs_status_idx" ON "parking_candidate_scan_runs"("status");

-- CreateIndex
CREATE INDEX "parking_candidate_scan_runs_started_at_idx" ON "parking_candidate_scan_runs"("started_at");

-- AddForeignKey
ALTER TABLE "parking_candidates" ADD CONSTRAINT "parking_candidates_linked_zone_id_fkey" FOREIGN KEY ("linked_zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_candidates" ADD CONSTRAINT "parking_candidates_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

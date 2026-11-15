CREATE TABLE "crowd_parking_metrics" (
    "id" SERIAL NOT NULL,
    "zone_id" INTEGER NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "avg_circling_time_seconds" INTEGER NOT NULL,
    "sample_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crowd_parking_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crowd_parking_metrics_zone_id_window_start_key"
ON "crowd_parking_metrics"("zone_id", "window_start");

CREATE INDEX "crowd_parking_metrics_zone_id_window_end_idx"
ON "crowd_parking_metrics"("zone_id", "window_end");

ALTER TABLE "crowd_parking_metrics"
ADD CONSTRAINT "crowd_parking_metrics_zone_id_fkey"
FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

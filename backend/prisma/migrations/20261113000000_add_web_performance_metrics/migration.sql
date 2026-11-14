CREATE TABLE "web_performance_metrics" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "rating" TEXT NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "web_performance_metrics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "web_performance_metrics_name_recorded_at_idx"
  ON "web_performance_metrics"("name", "recorded_at");
CREATE INDEX "web_performance_metrics_recorded_at_idx"
  ON "web_performance_metrics"("recorded_at");

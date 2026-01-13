# Databricks Real-Time Data Pipeline Architecture

**Date:** January 4, 2026
**Purpose:** PostgreSQL → GCP Cloud Storage → Databricks pipeline for near real-time analytics

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION SYSTEM                            │
├─────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Cloud SQL)                                             │
│  ├─ parking_sessions (hot data - active sessions)                   │
│  ├─ activity_events (streaming inserts every 5-10s)                 │
│  ├─ sensor_events (IoT data)                                        │
│  └─ zone_metrics (aggregated hourly)                                │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
                   │ (1) Change Data Capture (CDC)
                   │     Debezium Connector
                   │     Captures: INSERT, UPDATE, DELETE
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     STREAMING LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Pub/Sub (GCP)                                                      │
│  ├─ Topic: parking-sessions-cdc                                     │
│  ├─ Topic: activity-events-cdc                                      │
│  └─ Topic: sensor-events-cdc                                        │
│                                                                      │
│  Retention: 7 days                                                  │
│  Throughput: 10,000 msg/sec                                         │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
                   │ (2) Stream to Cloud Storage
                   │     Pub/Sub → Dataflow → GCS
                   │     Format: JSON (raw) / Parquet (optimized)
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  DATA LAKE (GCP Cloud Storage)                       │
├─────────────────────────────────────────────────────────────────────┤
│  gs://parkpal-data-lake/                                            │
│  ├─ bronze/ (raw CDC events)                                        │
│  │  ├─ parking_sessions/year=2026/month=01/day=04/hour=14/          │
│  │  │  └─ data_14-30-00.json (5-min batches)                        │
│  │  ├─ activity_events/...                                          │
│  │  └─ sensor_events/...                                            │
│  │                                                                   │
│  ├─ silver/ (cleaned & deduplicated)                                │
│  │  ├─ parking_sessions_cleaned/                                    │
│  │  └─ activity_events_enriched/                                    │
│  │                                                                   │
│  └─ gold/ (business-ready aggregates)                               │
│     ├─ zone_circling_metrics_hourly/                                │
│     ├─ zone_occupancy_realtime/                                     │
│     └─ ml_features/                                                 │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
                   │ (3) Delta Live Tables (DLT)
                   │     Databricks reads from GCS
                   │     Incrementally processes new files
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  DATABRICKS LAKEHOUSE                                │
├─────────────────────────────────────────────────────────────────────┤
│  Delta Lake Tables (on GCS)                                         │
│  ├─ Bronze Layer: Raw CDC events (append-only)                      │
│  ├─ Silver Layer: Cleaned & validated                               │
│  └─ Gold Layer: Aggregated metrics                                  │
│                                                                      │
│  Processing:                                                         │
│  ├─ Streaming: Auto Loader (5-min micro-batches)                    │
│  ├─ Batch: Hourly aggregations                                      │
│  └─ ML: Model training & inference                                  │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
                   │ (4) Serve Data
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CONSUMPTION LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ├─ PostgreSQL (write back aggregates for API)                      │
│  ├─ Redis (cache hot metrics)                                       │
│  ├─ API (serve predictions to mobile/web)                           │
│  └─ Dashboards (Databricks SQL, Looker)                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Pipeline Design

### **Layer 1: Change Data Capture (CDC) from PostgreSQL**

#### Option A: Debezium + Pub/Sub (Recommended)

**Why Debezium?**
- Captures every INSERT/UPDATE/DELETE from PostgreSQL WAL (Write-Ahead Log)
- Low latency (< 1 second from DB to Pub/Sub)
- No polling - event-driven
- Preserves order and transactional consistency

**Setup:**

```yaml
# debezium-config.yaml
name: parkpal-postgres-connector
config:
  connector.class: io.debezium.connector.postgresql.PostgresConnector

  # PostgreSQL connection
  database.hostname: 10.0.0.5  # Cloud SQL private IP
  database.port: 5432
  database.user: debezium_user
  database.password: ${SECRET_DB_PASSWORD}
  database.dbname: parknquik_prod

  # Which tables to capture
  table.include.list: >
    public.parking_sessions,
    public.activity_events,
    public.sensor_events,
    public.zone_metrics

  # Output to GCP Pub/Sub
  transforms: unwrap,route
  transforms.unwrap.type: io.debezium.transforms.ExtractNewRecordState
  transforms.route.type: org.apache.kafka.connect.transforms.RegexRouter
  transforms.route.regex: (.*)
  transforms.route.replacement: parkpal-$1-cdc

  # Performance
  max.batch.size: 2048
  max.queue.size: 8192

  # Pub/Sub sink
  pubsub.project.id: parkpal-prod
  pubsub.topic: parkpal-cdc-events
```

**PostgreSQL Configuration:**

```sql
-- Enable logical replication (required for Debezium)
ALTER SYSTEM SET wal_level = logical;
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_wal_senders = 10;

-- Create replication user
CREATE USER debezium_user WITH REPLICATION LOGIN PASSWORD 'secure_password';

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO debezium_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO debezium_user;

-- Create publication (defines what to replicate)
CREATE PUBLICATION dbz_publication FOR TABLE
  parking_sessions,
  activity_events,
  sensor_events,
  zone_metrics;
```

**Expected CDC Event Format:**

```json
{
  "op": "c",  // c=create, u=update, d=delete, r=read
  "ts_ms": 1704384720000,
  "source": {
    "db": "parknquik_prod",
    "schema": "public",
    "table": "activity_events",
    "lsn": 123456789
  },
  "before": null,  // Previous value (for updates)
  "after": {
    "id": 100,
    "user_id": 123,
    "session_id": 456,
    "activity_type": "IN_VEHICLE",
    "confidence": 85,
    "latitude": 14.5378,
    "longitude": 121.0213,
    "timestamp": "2025-10-05T14:30:00Z",
    "created_at": "2025-10-05T14:30:00Z"
  }
}
```

---

#### Option B: PostgreSQL Triggers → Cloud Functions → Pub/Sub (Simpler)

**When to use:** If Debezium is too complex for initial implementation.

```sql
-- Create trigger function
CREATE OR REPLACE FUNCTION notify_cdc_event()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  -- Build JSON payload
  payload = json_build_object(
    'op', TG_OP,
    'table', TG_TABLE_NAME,
    'data', row_to_json(NEW)
  );

  -- Send to Cloud Function via pg_notify (captured by Cloud Function)
  PERFORM pg_notify('parkpal_cdc', payload::text);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tables
CREATE TRIGGER activity_events_cdc_trigger
AFTER INSERT OR UPDATE ON activity_events
FOR EACH ROW EXECUTE FUNCTION notify_cdc_event();

CREATE TRIGGER parking_sessions_cdc_trigger
AFTER INSERT OR UPDATE ON parking_sessions
FOR EACH ROW EXECUTE FUNCTION notify_cdc_event();
```

**Cloud Function Listener:**

```javascript
// cloud-function/index.js
const { PubSub } = require('@google-cloud/pubsub');
const { Pool } = require('pg');

const pubsub = new PubSub();
const pool = new Pool({
  host: process.env.DB_HOST,
  database: 'parknquik_prod',
  user: 'cdc_user'
});

// Listen to PostgreSQL NOTIFY
pool.connect((err, client) => {
  if (err) throw err;

  client.query('LISTEN parkpal_cdc');

  client.on('notification', async (msg) => {
    const event = JSON.parse(msg.payload);

    // Publish to Pub/Sub
    const topic = pubsub.topic(`parkpal-${event.table}-cdc`);
    await topic.publishMessage({
      json: event
    });

    console.log(`Published ${event.op} event for ${event.table}`);
  });
});
```

---

### **Layer 2: Streaming to Cloud Storage**

#### Dataflow Job (GCP-native)

**Why Dataflow?**
- Managed Apache Beam
- Auto-scaling
- Exactly-once processing
- Native GCS integration

**Pipeline Code:**

```python
# dataflow_pipeline.py
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
from apache_beam.io.gcp.pubsub import ReadFromPubSub
from apache_beam.io.parquetio import WriteToParquet
import json
from datetime import datetime

class ParseCDCEvent(beam.DoFn):
    def process(self, element):
        event = json.loads(element)

        # Extract timestamp for partitioning
        ts = datetime.fromtimestamp(event['ts_ms'] / 1000)

        # Add partition columns
        event['after']['year'] = ts.year
        event['after']['month'] = ts.month
        event['after']['day'] = ts.day
        event['after']['hour'] = ts.hour

        yield event['after']

def run():
    options = PipelineOptions([
        '--project=parkpal-prod',
        '--runner=DataflowRunner',
        '--region=asia-southeast1',
        '--temp_location=gs://parkpal-temp/dataflow',
        '--streaming',
        '--max_num_workers=10'
    ])

    with beam.Pipeline(options=options) as p:
        # Read from Pub/Sub
        events = (p
            | 'Read from Pub/Sub' >> ReadFromPubSub(
                subscription='projects/parkpal-prod/subscriptions/activity-events-sub'
            )
            | 'Parse CDC Events' >> beam.ParDo(ParseCDCEvent())
        )

        # Write to GCS as Parquet (partitioned)
        events | 'Write to GCS' >> WriteToParquet(
            file_path_prefix='gs://parkpal-data-lake/bronze/activity_events/',
            schema=ACTIVITY_EVENT_SCHEMA,
            file_name_suffix='.parquet',
            shard_name_template='',
            num_shards=0,  # Auto
            # Partition by year/month/day/hour
            partition_cols=['year', 'month', 'day', 'hour']
        )

if __name__ == '__main__':
    run()
```

**Resulting File Structure:**

```
gs://parkpal-data-lake/bronze/activity_events/
  year=2026/
    month=01/
      day=04/
        hour=14/
          part-00000.parquet  (5-min batch, ~10MB)
          part-00001.parquet
        hour=15/
          part-00000.parquet
```

---

### **Layer 3: Databricks Delta Live Tables (DLT)**

#### Bronze → Silver → Gold Pipeline

**Bronze: Raw CDC Events (Append-Only)**

```python
# databricks/dlt_pipeline.py
import dlt
from pyspark.sql import functions as F

# Bronze: Ingest from GCS
@dlt.table(
    comment="Raw activity events from PostgreSQL CDC",
    table_properties={
        "quality": "bronze",
        "pipelines.autoOptimize.zOrderCols": "session_id,user_id"
    }
)
def bronze_activity_events():
    return (
        spark.readStream
            .format("cloudFiles")  # Auto Loader
            .option("cloudFiles.format", "parquet")
            .option("cloudFiles.schemaLocation", "gs://parkpal-checkpoint/activity_events_schema")
            .option("cloudFiles.maxFilesPerTrigger", 1000)  # Process 1000 files per batch
            .load("gs://parkpal-data-lake/bronze/activity_events/")
    )
```

**Silver: Cleaned & Validated**

```python
@dlt.table(
    comment="Cleaned activity events with quality checks",
    table_properties={"quality": "silver"}
)
@dlt.expect_or_drop("valid_confidence", "confidence BETWEEN 0 AND 100")
@dlt.expect_or_drop("valid_coordinates", "latitude IS NOT NULL AND longitude IS NOT NULL")
@dlt.expect_or_drop("valid_activity", "activity_type IN ('IN_VEHICLE', 'STILL', 'ON_FOOT', 'WALKING', 'RUNNING')")
def silver_activity_events():
    return (
        dlt.read_stream("bronze_activity_events")
            .withColumn("processed_at", F.current_timestamp())
            # Deduplication (in case of retries)
            .dropDuplicates(["id", "timestamp"])
            # Enrich with zone lookup
            .join(
                dlt.read("dim_zones"),
                on=[
                    F.expr("ST_Within(ST_Point(longitude, latitude), geofence_polygon)")
                ],
                how="left"
            )
    )
```

**Gold: Aggregated Metrics**

```python
@dlt.table(
    comment="Real-time zone occupancy (5-min windows)",
    table_properties={"quality": "gold"}
)
def gold_zone_circling_metrics_realtime():
    return (
        dlt.read_stream("silver_parking_sessions")
            .withWatermark("parking_confirmation_time", "10 minutes")
            .groupBy(
                F.window("parking_confirmation_time", "5 minutes"),
                "zone_id"
            )
            .agg(
                F.avg("circling_duration_seconds").alias("avg_circling_time"),
                F.min("circling_duration_seconds").alias("min_circling_time"),
                F.max("circling_duration_seconds").alias("max_circling_time"),
                F.count("id").alias("total_sessions")
            )
            .select(
                F.col("window.start").alias("window_start"),
                F.col("window.end").alias("window_end"),
                "zone_id",
                "avg_circling_time",
                "min_circling_time",
                "max_circling_time",
                "total_sessions"
            )
    )
```

---

### **Layer 4: Write Back to PostgreSQL (for API serving)**

**Databricks → PostgreSQL Sync**

```python
# Write aggregated metrics back to PostgreSQL
# Runs every 5 minutes

from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("WriteToPostgres").getOrCreate()

# Read from Gold layer
gold_metrics = spark.read.table("gold_zone_circling_metrics_realtime")

# Write to PostgreSQL
(
    gold_metrics
        .write
        .format("jdbc")
        .option("url", "jdbc:postgresql://10.0.0.5:5432/parknquik_prod")
        .option("dbtable", "zone_metrics_realtime")
        .option("user", "databricks_writer")
        .option("password", dbutils.secrets.get("parkpal", "postgres_password"))
        .option("driver", "org.postgresql.Driver")
        .mode("append")  # Or "overwrite" with WHERE clause
        .save()
)

# Also write to Redis for ultra-low latency API
import redis

r = redis.Redis(host='10.0.0.10', port=6379)

for row in gold_metrics.collect():
    key = f"zone:{row.zone_id}:circling_time"
    value = row.avg_circling_time
    r.setex(key, 300, value)  # 5-min TTL
```

---

## Latency Breakdown

| Stage | Latency | Cumulative |
|-------|---------|------------|
| PostgreSQL → Debezium | < 1 second | 1s |
| Debezium → Pub/Sub | < 500ms | 1.5s |
| Pub/Sub → Dataflow → GCS | 2-5 minutes (batching) | 3-6 minutes |
| GCS → Databricks (Auto Loader) | 5 minutes (trigger interval) | 8-11 minutes |
| Databricks aggregation | 1-2 minutes | 9-13 minutes |
| PostgreSQL write-back | 30 seconds | **10-14 minutes** |

**Total End-to-End Latency: 10-14 minutes** (near real-time)

---

## Optimizations for Lower Latency

### Option 1: Reduce Batching (Costs More)

```python
# Reduce Dataflow batching to 1 minute
options = PipelineOptions([
    '--streaming',
    '--max_num_workers=20',  # More workers
    '--window_size=60',      # 1-min windows (instead of 5-min)
])

# Reduce Databricks trigger interval
@dlt.table()
def bronze_activity_events():
    return (
        spark.readStream
            .option("cloudFiles.maxFilesPerTrigger", 100)
            .trigger(processingTime='1 minute')  # Check for new files every 1 min
            .load("gs://parkpal-data-lake/bronze/activity_events/")
    )
```

**New Latency: 3-5 minutes**

---

### Option 2: Direct Streaming (No GCS intermediary)

```python
# Databricks reads directly from Pub/Sub (experimental)
from pyspark.sql.functions import from_json, col

@dlt.table()
def bronze_activity_events_streaming():
    schema = "id INT, user_id INT, activity_type STRING, ..."

    return (
        spark.readStream
            .format("pubsub")
            .option("project", "parkpal-prod")
            .option("subscription", "activity-events-sub")
            .load()
            .select(from_json(col("data").cast("string"), schema).alias("event"))
            .select("event.*")
    )
```

**New Latency: < 2 minutes** (but more complex, less reliable)

---

## Recommended Architecture (Phase 6)

**Start Simple, Scale Smart:**

### Phase 6: Hourly Batch Processing (RECOMMENDED)

**Why Hourly Makes Sense:**
- **Volume:** With crowdsourced data from thousands of users, data arrives continuously
- **Use Case:** Parking predictions don't need sub-minute freshness
- **Cost-Effective:** Batch processing is 5-10x cheaper than streaming
- **Sufficient:** 1-hour old metrics are still valuable for predicting circling time

**Implementation:**

```python
# Databricks Notebook - Scheduled hourly via Databricks Workflows
# Runs at: 00:00, 01:00, 02:00, ... every hour

from pyspark.sql import functions as F
from datetime import datetime, timedelta

# Calculate the previous hour window
now = datetime.now()
hour_start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
hour_end = now.replace(minute=0, second=0, microsecond=0)

print(f"Processing data for: {hour_start} to {hour_end}")

# 1. EXTRACT: Read from PostgreSQL (last hour's data)
activity_events = (
    spark.read
        .format("jdbc")
        .option("url", "jdbc:postgresql://10.0.0.5:5432/parknquik_prod")
        .option("dbtable", f"""
            (SELECT * FROM activity_events
             WHERE timestamp >= '{hour_start}'
             AND timestamp < '{hour_end}')
        """)
        .option("user", "databricks_reader")
        .option("password", dbutils.secrets.get("parkpal", "postgres_password"))
        .option("driver", "org.postgresql.Driver")
        .option("fetchsize", 10000)  # Batch read
        .load()
)

parking_sessions = (
    spark.read
        .format("jdbc")
        .option("url", "jdbc:postgresql://10.0.0.5:5432/parknquik_prod")
        .option("dbtable", f"""
            (SELECT * FROM parking_sessions
             WHERE parking_confirmation_time >= '{hour_start}'
             AND parking_confirmation_time < '{hour_end}'
             AND circling_duration_seconds IS NOT NULL)
        """)
        .option("user", "databricks_reader")
        .option("password", dbutils.secrets.get("parkpal", "postgres_password"))
        .load()
)

# 2. LOAD to Bronze (Raw data lake on GCS)
(
    activity_events
        .write
        .mode("append")
        .partitionBy("year", "month", "day", "hour")
        .parquet("gs://parkpal-data-lake/bronze/activity_events/")
)

(
    parking_sessions
        .write
        .mode("append")
        .partitionBy("year", "month", "day", "hour")
        .parquet("gs://parkpal-data-lake/bronze/parking_sessions/")
)

# 3. TRANSFORM to Silver (Cleaned)
silver_sessions = (
    parking_sessions
        .filter("circling_duration_seconds BETWEEN 0 AND 3600")  # 0-60 min valid range
        .filter("data_quality IN ('high', 'medium')")  # Exclude low quality
        .withColumn("hour_of_day", F.hour("parking_confirmation_time"))
        .withColumn("day_of_week", F.dayofweek("parking_confirmation_time"))
)

# 4. AGGREGATE to Gold (Business metrics)
zone_metrics = (
    silver_sessions
        .groupBy("zone_id")
        .agg(
            F.avg("circling_duration_seconds").alias("avg_circling_time_seconds"),
            F.expr("percentile_approx(circling_duration_seconds, 0.5)").alias("median_circling_time"),
            F.min("circling_duration_seconds").alias("min_circling_time_seconds"),
            F.max("circling_duration_seconds").alias("max_circling_time_seconds"),
            F.count("id").alias("total_sessions"),
            F.stddev("circling_duration_seconds").alias("stddev_circling_time")
        )
        .withColumn("timestamp", F.lit(hour_start))
        .withColumn("period_type", F.lit("hourly"))
)

# 5. WRITE BACK to PostgreSQL (for API)
(
    zone_metrics
        .write
        .format("jdbc")
        .option("url", "jdbc:postgresql://10.0.0.5:5432/parknquik_prod")
        .option("dbtable", "zone_metrics")
        .option("user", "databricks_writer")
        .option("password", dbutils.secrets.get("parkpal", "postgres_password"))
        .mode("append")
        .save()
)

# 6. UPDATE Redis Cache (for ultra-fast API)
import redis
r = redis.Redis(host='10.0.0.10', port=6379)

for row in zone_metrics.collect():
    key = f"zone:{row.zone_id}:circling_time"
    r.setex(
        key,
        3600,  # 1-hour TTL
        int(row.avg_circling_time_seconds)
    )
    print(f"Cached zone {row.zone_id}: {row.avg_circling_time_seconds}s avg circling")

print(f"✅ Processed {parking_sessions.count()} sessions")
```

**Databricks Workflow Configuration:**

```yaml
# databricks_workflow.yaml
name: parkpal-hourly-analytics
schedule:
  quartz_cron_expression: "0 5 * * * ?"  # Run at 5 minutes past every hour
  timezone_id: "Asia/Manila"

tasks:
  - task_key: extract_and_aggregate
    notebook_task:
      notebook_path: /Workspace/parkpal/hourly_analytics
      base_parameters:
        env: production
    job_cluster_key: analytics_cluster

job_clusters:
  - job_cluster_key: analytics_cluster
    new_cluster:
      spark_version: "13.3.x-scala2.12"
      node_type_id: "n2-standard-4"  # GCP instance type
      num_workers: 2  # Auto-scale 2-4
      autoscale:
        min_workers: 2
        max_workers: 4
      gcp_attributes:
        google_service_account: "databricks@parkpal-prod.iam.gserviceaccount.com"
```

**Cost:** $50-80/month (2 workers × 1 hour/day × 30 days × $0.40/DBU)

---

### When to Upgrade to Micro-Batches (Phase 7 - Optional)

**Only upgrade if:**
- User base > 50,000 active users
- B2B customers demand < 15-min freshness
- Revenue justifies the cost ($200-300/month additional)

**Micro-Batch Implementation:**
- Same pipeline, but runs every 15 minutes instead of hourly
- Cost: 4x higher (24 runs/day instead of 24 runs/day × 15 min)
- Latency: 15-20 minutes (vs 1 hour)

---

## Cost Estimation

**Monthly Costs (5,000 active users, 50k sessions/day):**

| Component | Usage | Cost |
|-----------|-------|------|
| **Cloud SQL (PostgreSQL)** | db-n1-standard-2 | $100 |
| **Pub/Sub** | 50k msg/day × 30 = 1.5M msg/month | $0.40 |
| **Dataflow** | 2 workers × 24h × 30 days | $150 |
| **GCS** | 500 GB storage + 1 TB egress | $30 |
| **Databricks** | 5 DBU/day × 30 days × $0.40/DBU | $60 |
| **Redis** | 1 GB | $20 |
| **Total** | | **~$360/month** |

**Optimization:** Start with hourly batches ($50/month), scale to real-time as usage grows.

---

## Summary

### **Recommended Approach: Hourly Batch Processing**

**How data flows from PostgreSQL to Databricks (Hourly):**

1. **PostgreSQL** - Stores incoming user activity data continuously
2. **Databricks Workflow** - Runs at 5 minutes past every hour
3. **Extract** - Pull last hour's data via JDBC (10,000 records/batch)
4. **Load to Bronze** - Save raw Parquet files to GCS (partitioned by hour)
5. **Transform to Silver** - Clean, validate, filter low-quality data
6. **Aggregate to Gold** - Calculate zone metrics (avg/median/min/max circling time)
7. **Write-back** - Store aggregated metrics in PostgreSQL + Redis cache
8. **API Serving** - Mobile/web apps query PostgreSQL/Redis for predictions

**Total Latency:** 1 hour (sufficient for parking predictions)
**Cost:** $50-80/month (vs $360/month for near real-time)

---

### **Why Hourly Batch is Perfect for ParkPal:**

✅ **Crowdsourced Data:** Thousands of users contribute continuously
✅ **Prediction Use Case:** Drivers care about "average circling time in the last hour" not "last 5 minutes"
✅ **Cost-Effective:** 5-10x cheaper than streaming
✅ **Scalable:** Same architecture handles 1,000 or 100,000 users
✅ **Simple:** Less infrastructure to maintain

**Example User Experience:**
```
User searches: "SM Mall of Asia parking" at 2:35 PM
API returns: "Average 7 min to find parking (based on 2:00-3:00 PM data)"
Data freshness: 35 minutes old → Totally acceptable!
```

---

### **Upgrade Path (Only if Needed):**

**Phase 7 (50k+ users, B2B contracts):** 15-min micro-batches ($200-300/month)
**Phase 8 (100k+ users, premium features):** Near real-time streaming ($360-500/month)

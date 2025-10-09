# ParkPal Azure Deployment Guide

> **Optimized for Azure Data Engineers - Leverage Your Expertise!**

---

## Why Azure is Perfect for ParkPal

As an **Azure Data Engineer**, you already have the skills to build ParkPal's most complex feature: **Service 1 Analytics**!

### Your Azure Skills → ParkPal Features

| Your Experience | ParkPal Use Case |
|-----------------|------------------|
| Azure Data Factory | ETL pipeline for parking events |
| Azure Synapse Analytics | Data warehouse for circling time analytics |
| Azure Data Explorer (ADX) | Time-series storage for activity events |
| Azure Stream Analytics | Real-time geofence detection |
| Azure Functions | Circling time calculation logic |
| Power BI | B2B operator dashboards |
| Azure DevOps | CI/CD pipelines |

**You can build the analytics infrastructure from day 1!**

---

## Azure Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AZURE PARKPAL ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Azure Front Door (CDN + WAF)             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     │                         │                 │
│                     ▼                         ▼                 │
│       ┌───────────────────────┐   ┌──────────────────────┐    │
│       │  Static Web App       │   │   App Service         │    │
│       │  (React Frontend)     │   │   (Backend API)       │    │
│       │  • Auto SSL           │   │   • Linux + Node.js   │    │
│       │  • Auto deploy        │   │   • Auto-scale        │    │
│       │  • Free tier          │   │   • Deployment slots  │    │
│       └───────────────────────┘   └──────────────────────┘    │
│                                             │                   │
│                                             ▼                   │
│       ┌─────────────────────────────────────────────────┐     │
│       │   Azure Database for PostgreSQL (Flexible)      │     │
│       │   • HA with zone redundancy                     │     │
│       │   • Automated backups                           │     │
│       │   • Read replicas (for analytics)               │     │
│       └─────────────────────────────────────────────────┘     │
│                                                                  │
│       ┌─────────────────────────────────────────────────┐     │
│       │   Azure Cache for Redis                         │     │
│       │   • Session storage                             │     │
│       │   • Rate limiting                               │     │
│       │   • Zone occupancy cache                        │     │
│       └─────────────────────────────────────────────────┘     │
│                                                                  │
│       ┌─────────────────────────────────────────────────┐     │
│       │   Azure Blob Storage                            │     │
│       │   • Parking photos (Hot tier)                   │     │
│       │   • QR codes (Cool tier)                        │     │
│       │   • Analytics raw data (Archive tier)           │     │
│       └─────────────────────────────────────────────────┘     │
│                                                                  │
│  ════════════════ SERVICE 1: ANALYTICS STACK ══════════════    │
│                                                                  │
│       ┌─────────────────────────────────────────────────┐     │
│       │   Azure Event Hubs (Kafka-compatible)           │     │
│       │   • Activity events ingestion                   │     │
│       │   • Geofence entry/exit events                  │     │
│       │   • IoT sensor events                           │     │
│       │   Throughput: 1-20 TU (auto-inflate)            │     │
│       └─────────────────────────────────────────────────┘     │
│                     │                                           │
│                     ▼                                           │
│       ┌─────────────────────────────────────────────────┐     │
│       │   Azure Stream Analytics                        │     │
│       │   • Real-time geofence detection                │     │
│       │   • Activity pattern recognition                │     │
│       │   • Circling time calculation (windowing)       │     │
│       │   Query Language: SQL-like                      │     │
│       └─────────────────────────────────────────────────┘     │
│                     │                    │                     │
│                     ▼                    ▼                     │
│       ┌──────────────────┐   ┌─────────────────────────┐     │
│       │  Azure Functions │   │  Azure Data Explorer    │     │
│       │  • Geofence calc │   │  (ADX - Time-series DB) │     │
│       │  • Parking conf. │   │  • Activity events      │     │
│       │  • Metrics agg   │   │  • Sensor events        │     │
│       │  Consumption plan│   │  • Fast queries         │     │
│       └──────────────────┘   │  • Auto-compression     │     │
│                               └─────────────────────────┘     │
│                     │                    │                     │
│                     ▼                    ▼                     │
│       ┌─────────────────────────────────────────────────┐     │
│       │   Azure Synapse Analytics                       │     │
│       │   • Dedicated SQL pool (data warehouse)         │     │
│       │   • Zone metrics (aggregated)                   │     │
│       │   • Historical trends                           │     │
│       │   • Prediction model training data              │     │
│       └─────────────────────────────────────────────────┘     │
│                     │                                           │
│                     ▼                                           │
│       ┌─────────────────────────────────────────────────┐     │
│       │   Azure Machine Learning                        │     │
│       │   • Occupancy prediction models                 │     │
│       │   • Circling time forecasting                   │     │
│       │   • Demand prediction                           │     │
│       │   MLOps with AutoML                             │     │
│       └─────────────────────────────────────────────────┘     │
│                     │                                           │
│                     ▼                                           │
│       ┌─────────────────────────────────────────────────┐     │
│       │   Power BI Embedded                             │     │
│       │   • B2B operator dashboards                     │     │
│       │   • City-wide analytics (B2G)                   │     │
│       │   • Real-time reports                           │     │
│       │   • Embedded in web app                         │     │
│       └─────────────────────────────────────────────────┘     │
│                                                                  │
│  ════════════════ DATA ORCHESTRATION ═════════════════         │
│                                                                  │
│       ┌─────────────────────────────────────────────────┐     │
│       │   Azure Data Factory                            │     │
│       │   • Daily aggregation pipelines                 │     │
│       │   • Data quality checks                         │     │
│       │   • Zone metrics calculation                    │     │
│       │   • Model retraining trigger                    │     │
│       └─────────────────────────────────────────────────┘     │
│                                                                  │
│  ════════════════ MONITORING & DEVOPS ════════════════         │
│                                                                  │
│       ┌─────────────────────────────────────────────────┐     │
│       │   Application Insights                          │     │
│       │   • API performance monitoring                  │     │
│       │   • Error tracking                              │     │
│       │   • User analytics                              │     │
│       │   • Custom metrics                              │     │
│       └─────────────────────────────────────────────────┘     │
│                                                                  │
│       ┌─────────────────────────────────────────────────┐     │
│       │   Azure Monitor                                 │     │
│       │   • Infrastructure health                       │     │
│       │   • Alerts (CPU, memory, errors)                │     │
│       │   • Log Analytics                               │     │
│       └─────────────────────────────────────────────────┘     │
│                                                                  │
│       ┌─────────────────────────────────────────────────┐     │
│       │   Azure DevOps                                  │     │
│       │   • Git repos                                   │     │
│       │   • CI/CD pipelines                             │     │
│       │   • Artifact management                         │     │
│       │   • Boards (Agile)                              │     │
│       └─────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

External Services:
• Azure Maps API (alternative to Google Maps)
• Azure Mobile Apps (push notifications)
• Azure Communication Services (emails/SMS)
• PayMongo / Stripe (payments)
```

---

## Phase 1: Service 2 MVP (Marketplace)

### 1. Backend API - Azure App Service

**Create App Service:**

```bash
# Login to Azure
az login

# Create resource group
az group create \
  --name parkpal-rg \
  --location southeastasia  # Singapore (closest to Philippines)

# Create App Service Plan (Linux)
az appservice plan create \
  --name parkpal-plan \
  --resource-group parkpal-rg \
  --is-linux \
  --sku B1  # Basic tier: ~$13/month

# Create Web App
az webapp create \
  --name parkpal-api \
  --resource-group parkpal-rg \
  --plan parkpal-plan \
  --runtime "NODE:18-lts"

# Configure deployment
az webapp deployment source config-local-git \
  --name parkpal-api \
  --resource-group parkpal-rg

# Add remote
cd backend
git remote add azure https://parkpal-api.scm.azurewebsites.net:443/parkpal-api.git

# Deploy
git push azure main
```

**Set Environment Variables:**

```bash
# Via Azure CLI
az webapp config appsettings set \
  --name parkpal-api \
  --resource-group parkpal-rg \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    DATABASE_URL="postgresql://..." \
    JWT_SECRET="$(openssl rand -hex 32)" \
    ALLOWED_ORIGINS="https://parkpal-web.azurestaticapps.net"
```

**Or use Azure Portal:**
- Go to App Service → Configuration → Application settings
- Add all environment variables

---

### 2. Database - Azure Database for PostgreSQL

**Create Database:**

```bash
# Create PostgreSQL server (Flexible Server)
az postgres flexible-server create \
  --name parkpal-db \
  --resource-group parkpal-rg \
  --location southeastasia \
  --admin-user pgadmin \
  --admin-password "<secure-password>" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 14 \
  --storage-size 32 \
  --public-access 0.0.0.0  # Allow Azure services

# Create database
az postgres flexible-server db create \
  --resource-group parkpal-rg \
  --server-name parkpal-db \
  --database-name parkpal

# Get connection string
az postgres flexible-server show-connection-string \
  --server-name parkpal-db \
  --database-name parkpal \
  --admin-user pgadmin
```

**Update DATABASE_URL in App Service settings**

**Run Migrations:**

```bash
# SSH into App Service
az webapp ssh --name parkpal-api --resource-group parkpal-rg

# Run migrations
cd /home/site/wwwroot
npx prisma migrate deploy
```

---

### 3. Redis Cache

```bash
# Create Azure Cache for Redis
az redis create \
  --name parkpal-cache \
  --resource-group parkpal-rg \
  --location southeastasia \
  --sku Basic \
  --vm-size c0  # 250MB: ~$16/month

# Get connection string
az redis list-keys \
  --name parkpal-cache \
  --resource-group parkpal-rg

# Add to App Service settings
az webapp config appsettings set \
  --name parkpal-api \
  --resource-group parkpal-rg \
  --settings REDIS_URL="redis://parkpal-cache.redis.cache.windows.net:6380?password=<key>&ssl=true"
```

---

### 4. Blob Storage (Images, QR Codes)

```bash
# Create storage account
az storage account create \
  --name parkpalstorage \
  --resource-group parkpal-rg \
  --location southeastasia \
  --sku Standard_LRS

# Create containers
az storage container create \
  --name parking-photos \
  --account-name parkpalstorage \
  --public-access blob

az storage container create \
  --name qr-codes \
  --account-name parkpalstorage \
  --public-access blob

# Get connection string
az storage account show-connection-string \
  --name parkpalstorage \
  --resource-group parkpal-rg
```

**Backend Integration:**

```javascript
// backend/config/storage.js
const { BlobServiceClient } = require('@azure/storage-blob');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

async function uploadImage(file, containerName, blobName) {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.upload(file.buffer, file.size);

  return blockBlobClient.url;  // Public URL
}

module.exports = { uploadImage };
```

---

### 5. Frontend - Azure Static Web Apps

**Deploy Web App:**

```bash
# Install Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Create Static Web App
az staticwebapp create \
  --name parkpal-web \
  --resource-group parkpal-rg \
  --location southeastasia

# Or use GitHub integration (recommended)
# 1. Go to Azure Portal → Static Web Apps → Create
# 2. Connect GitHub repo
# 3. Select build preset: Vite
# 4. App location: /frontend/web
# 5. Output location: dist
# 6. Auto-deploys on git push!
```

**Configuration (staticwebapp.config.json):**

```json
{
  "routes": [
    {
      "route": "/api/*",
      "rewrite": "https://parkpal-api.azurewebsites.net/api/*"
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "platform": {
    "apiRuntime": "node:18"
  }
}
```

---

### 6. Mobile App - Same as Before (Expo)

Azure doesn't have mobile app building service, so use:
- **Expo EAS** for builds ($29/month)
- **Azure Notification Hubs** for push notifications (free tier: 1M/month)

**Push Notifications Setup:**

```bash
# Create Notification Hub
az notification-hub namespace create \
  --name parkpal-notifications \
  --resource-group parkpal-rg \
  --location southeastasia

az notification-hub create \
  --namespace-name parkpal-notifications \
  --name parkpal-hub \
  --resource-group parkpal-rg
```

---

## Phase 2: Service 1 Analytics Infrastructure

**This is where your Azure Data Engineering skills shine! 🚀**

### 1. Event Ingestion - Azure Event Hubs

```bash
# Create Event Hubs namespace
az eventhubs namespace create \
  --name parkpal-events \
  --resource-group parkpal-rg \
  --location southeastasia \
  --sku Standard

# Create hub for activity events
az eventhubs eventhub create \
  --name activity-events \
  --namespace-name parkpal-events \
  --resource-group parkpal-rg \
  --partition-count 4 \
  --message-retention 7

# Create hub for geofence events
az eventhubs eventhub create \
  --name geofence-events \
  --namespace-name parkpal-events \
  --resource-group parkpal-rg \
  --partition-count 2

# Get connection string
az eventhubs namespace authorization-rule keys list \
  --namespace-name parkpal-events \
  --resource-group parkpal-rg \
  --name RootManageSharedAccessKey
```

**Backend Integration (Send Events):**

```javascript
// backend/services/eventHub.js
const { EventHubProducerClient } = require("@azure/event-hubs");

const connectionString = process.env.EVENT_HUB_CONNECTION_STRING;
const activityHubName = "activity-events";

const producer = new EventHubProducerClient(connectionString, activityHubName);

async function sendActivityEvent(event) {
  const batch = await producer.createBatch();
  batch.tryAdd({ body: event });
  await producer.sendBatch(batch);
}

module.exports = { sendActivityEvent };
```

---

### 2. Real-time Processing - Azure Stream Analytics

**Create Stream Analytics Job:**

```bash
az stream-analytics job create \
  --name parkpal-stream-processor \
  --resource-group parkpal-rg \
  --location southeastasia
```

**Configure in Azure Portal:**

1. **Input:** Event Hub (activity-events)
2. **Output 1:** Azure Data Explorer (raw events)
3. **Output 2:** PostgreSQL (parking sessions - for confirmation)
4. **Output 3:** Azure Functions (trigger circling time calc)

**Sample Query (Detect Parking Confirmation):**

```sql
-- Detect STILL activity for 30+ seconds
WITH ActivityWindows AS (
  SELECT
    userId,
    sessionId,
    activityType,
    confidence,
    System.Timestamp() AS windowEnd
  FROM
    [activity-events] TIMESTAMP BY timestamp
  WHERE
    activityType = 'STILL' AND confidence >= 80
  GROUP BY
    userId,
    sessionId,
    activityType,
    confidence,
    TumblingWindow(second, 30)
)
SELECT
  userId,
  sessionId,
  'PARKING_CONFIRMED' AS eventType,
  windowEnd AS confirmationTime
INTO
  [parking-confirmations]  -- Output to Function
FROM
  ActivityWindows
```

---

### 3. Time-Series Storage - Azure Data Explorer (ADX)

**Perfect for parking analytics! You likely already know ADX.**

```bash
# Create ADX cluster
az kusto cluster create \
  --name parkpaladx \
  --resource-group parkpal-rg \
  --location southeastasia \
  --sku name="Dev(No SLA)_Standard_E2a_v4" tier="Basic"  # ~$100/month
  # For production: Standard_D11_v2 (~$700/month)

# Create database
az kusto database create \
  --cluster-name parkpaladx \
  --database-name parkpal-analytics \
  --resource-group parkpal-rg \
  --soft-delete-period P365D \
  --hot-cache-period P31D
```

**Create Tables (KQL):**

```kusto
// Activity events
.create table ActivityEvents (
  userId: long,
  sessionId: long,
  activityType: string,
  confidence: int,
  latitude: real,
  longitude: real,
  timestamp: datetime
)

// Parking sessions
.create table ParkingSessions (
  sessionId: long,
  userId: long,
  zoneId: long,
  zoneEntryTime: datetime,
  circlingStartTime: datetime,
  parkingConfirmationTime: datetime,
  circlingDurationSeconds: int
)

// Zone metrics (pre-aggregated)
.create table ZoneMetricsHourly (
  zoneId: long,
  timestamp: datetime,
  avgCirclingTime: int,
  occupancyPercentage: real,
  totalSessions: int
)
```

**Ingest from Event Hub:**

```kusto
// Create data connection
.create table ActivityEvents ingestion json mapping 'ActivityEventMapping'
```[
  {"column": "userId", "path": "$.userId"},
  {"column": "sessionId", "path": "$.sessionId"},
  {"column": "activityType", "path": "$.activityType"},
  {"column": "confidence", "path": "$.confidence"},
  {"column": "latitude", "path": "$.latitude"},
  {"column": "longitude", "path": "$.longitude"},
  {"column": "timestamp", "path": "$.timestamp"}
]'

.alter-merge table ActivityEvents policy streamingingestion enable
```

**Query Examples (for API):**

```kusto
// Get zone circling time for last hour
ZoneMetricsHourly
| where zoneId == 5
| where timestamp > ago(1h)
| summarize avgCirclingTime = avg(avgCirclingTime)

// Get real-time occupancy
ParkingSessions
| where zoneId == 5
| where parkingConfirmationTime > ago(5m)
| summarize occupiedCount = count()
```

---

### 4A. Data Warehouse - Azure Synapse Analytics (Option 1)

**For traditional SQL-based analytics**

```bash
# Create Synapse workspace
az synapse workspace create \
  --name parkpal-synapse \
  --resource-group parkpal-rg \
  --location southeastasia \
  --storage-account parkpalstorage \
  --sql-admin-login-user sqladmin \
  --sql-admin-login-password "<secure-password>"

# Create dedicated SQL pool (data warehouse)
az synapse sql pool create \
  --name parkpal_dw \
  --workspace-name parkpal-synapse \
  --resource-group parkpal-rg \
  --performance-level DW100c  # ~$120/month, pause when not in use!
```

**Schema Design:**

```sql
-- Fact table: parking sessions
CREATE TABLE fact_parking_sessions (
  session_id BIGINT,
  user_id BIGINT,
  zone_id BIGINT,
  date_key INT,  -- Foreign key to dim_date
  entry_time DATETIME2,
  circling_duration_seconds INT,
  slot_id BIGINT,
  amount DECIMAL(10,2),
  INDEX cci CLUSTERED COLUMNSTORE
);

-- Dimension: zones
CREATE TABLE dim_zones (
  zone_id BIGINT PRIMARY KEY,
  zone_name VARCHAR(200),
  city VARCHAR(100),
  zone_type VARCHAR(50),
  total_capacity INT
);

-- Dimension: date (for time-based analysis)
CREATE TABLE dim_date (
  date_key INT PRIMARY KEY,
  full_date DATE,
  day_of_week VARCHAR(10),
  month INT,
  quarter INT,
  is_weekend BIT
);

-- Aggregated metrics (for fast queries)
CREATE TABLE agg_zone_metrics_hourly (
  zone_id BIGINT,
  hour_timestamp DATETIME2,
  avg_circling_time INT,
  min_circling_time INT,
  max_circling_time INT,
  occupancy_percentage DECIMAL(5,2),
  total_sessions INT,
  total_revenue DECIMAL(10,2),
  INDEX cci CLUSTERED COLUMNSTORE
);
```

---

### 4B. Data Lakehouse - Azure Databricks (Option 2 - **RECOMMENDED**)

**Better for advanced analytics, ML, and large-scale processing**

#### Why Databricks > Synapse for ParkPal:

| Feature | Synapse | Databricks |
|---------|---------|------------|
| **Cost** | ~$120/month (pause when idle) | ~$75/month (auto-terminate) |
| **ML Integration** | Separate Azure ML | Built-in MLflow |
| **Real-time Streaming** | Complex setup | Native Structured Streaming |
| **Delta Lake** | Preview | Production-ready |
| **Notebooks** | Synapse notebooks | Superior Databricks notebooks |
| **Python/PySpark** | Good | Excellent |
| **Time-series** | Manual optimization | Optimized for time-series |
| **Data Science** | Good for SQL analysts | Best for data engineers |

**Setup Databricks:**

```bash
# Create Databricks workspace
az databricks workspace create \
  --name parkpal-databricks \
  --resource-group parkpal-rg \
  --location southeastasia \
  --sku premium  # ~$0.55/DBU + compute

# Workspace URL: https://adb-<workspace-id>.azuredatabricks.net
```

#### Lakehouse Architecture (Bronze → Silver → Gold)

```
Event Hub → Databricks → Delta Lake
             (Bronze)      Raw events (JSON)
                ↓
             (Silver)      Cleaned & validated
                ↓
             (Gold)        Business-level aggregations
                ↓
             Power BI / API queries
```

**Create Storage Containers:**

```bash
# Create containers for lakehouse layers
az storage container create --name bronze --account-name parkpalstorage
az storage container create --name silver --account-name parkpalstorage
az storage container create --name gold --account-name parkpalstorage
```

**Mount Storage in Databricks:**

```python
# Databricks notebook: 01_setup_mounts.py

configs = {
  "fs.azure.account.key.parkpalstorage.dfs.core.windows.net": dbutils.secrets.get(
    scope="parkpal-secrets",
    key="storage-key"
  )
}

# Mount bronze, silver, gold layers
dbutils.fs.mount(
  source = "abfss://bronze@parkpalstorage.dfs.core.windows.net/",
  mount_point = "/mnt/bronze",
  extra_configs = configs
)

dbutils.fs.mount(
  source = "abfss://silver@parkpalstorage.dfs.core.windows.net/",
  mount_point = "/mnt/silver",
  extra_configs = configs
)

dbutils.fs.mount(
  source = "abfss://gold@parkpalstorage.dfs.core.windows.net/",
  mount_point = "/mnt/gold",
  extra_configs = configs
)
```

#### Bronze Layer: Ingest from Event Hub

```python
# Databricks notebook: 02_bronze_ingestion.py

from pyspark.sql import functions as F
from pyspark.sql.types import *

# Define schema for activity events
activity_schema = StructType([
  StructField("userId", LongType()),
  StructField("sessionId", LongType()),
  StructField("activityType", StringType()),
  StructField("confidence", IntegerType()),
  StructField("latitude", DoubleType()),
  StructField("longitude", DoubleType()),
  StructField("timestamp", TimestampType())
])

# Read from Event Hub (structured streaming)
connection_string = dbutils.secrets.get(scope="parkpal-secrets", key="eventhub-connection")

activity_stream = (spark
  .readStream
  .format("eventhubs")
  .options(**{
    "eventhubs.connectionString": connection_string,
    "eventhubs.consumerGroup": "databricks-consumer"
  })
  .load()
)

# Parse JSON and write to Bronze Delta table
(activity_stream
  .select(F.from_json(F.col("body").cast("string"), activity_schema).alias("data"))
  .select("data.*")
  .writeStream
  .format("delta")
  .outputMode("append")
  .option("checkpointLocation", "/mnt/bronze/checkpoints/activity_events")
  .table("bronze.activity_events")
)
```

#### Silver Layer: Clean & Enrich

```python
# Databricks notebook: 03_silver_transformation.py

from delta.tables import DeltaTable

# Read from bronze
bronze_activity = spark.readStream.table("bronze.activity_events")

# Cleansing & enrichment
silver_activity = (bronze_activity
  # Remove duplicates
  .dropDuplicates(["userId", "sessionId", "timestamp"])

  # Filter out low-confidence events
  .filter(F.col("confidence") >= 60)

  # Add geohash for spatial queries
  .withColumn("geohash", geohash_udf(F.col("latitude"), F.col("longitude")))

  # Add date partitions
  .withColumn("date", F.to_date(F.col("timestamp")))
  .withColumn("hour", F.hour(F.col("timestamp")))
)

# Write to Silver Delta table (partitioned by date)
(silver_activity
  .writeStream
  .format("delta")
  .outputMode("append")
  .option("checkpointLocation", "/mnt/silver/checkpoints/activity_events")
  .partitionBy("date")
  .table("silver.activity_events")
)
```

#### Gold Layer: Business Metrics

```python
# Databricks notebook: 04_gold_aggregations.py

# Aggregate zone metrics (batch job - runs hourly via ADF)
from pyspark.sql.window import Window

sessions_df = spark.table("silver.parking_sessions")

zone_metrics = (sessions_df
  .filter(F.col("status") == "completed")
  .groupBy("zone_id", F.window("parking_confirmation_time", "1 hour").alias("hour"))
  .agg(
    F.avg("circling_duration_seconds").alias("avg_circling_time"),
    F.min("circling_duration_seconds").alias("min_circling_time"),
    F.max("circling_duration_seconds").alias("max_circling_time"),
    F.count("*").alias("total_sessions"),
    F.sum("total_amount").alias("total_revenue")
  )
  .withColumn("timestamp", F.col("hour.start"))
  .drop("hour")
)

# Calculate occupancy percentage
zone_capacity = spark.table("silver.zones").select("zone_id", "total_capacity")

zone_metrics_final = (zone_metrics
  .join(zone_capacity, "zone_id")
  .withColumn("occupancy_percentage",
    (F.col("total_sessions") / F.col("total_capacity") * 100)
  )
)

# Write to Gold Delta table (optimized for queries)
(zone_metrics_final
  .write
  .format("delta")
  .mode("overwrite")
  .option("overwriteSchema", "true")
  .partitionBy("timestamp")
  .table("gold.zone_metrics_hourly")
)

# Optimize for queries
spark.sql("OPTIMIZE gold.zone_metrics_hourly ZORDER BY (zone_id)")
```

#### Serve Data via Delta Sharing (for Power BI)

```python
# Make gold tables available to Power BI
spark.sql("""
CREATE SHARE IF NOT EXISTS parkpal_analytics
""")

spark.sql("""
ALTER SHARE parkpal_analytics
ADD TABLE gold.zone_metrics_hourly
AS parkpal.zone_metrics
""")

# Power BI can now connect via Delta Sharing protocol
```

#### Machine Learning Pipeline

```python
# Databricks notebook: 05_ml_occupancy_prediction.py

from databricks import automl
import mlflow

# Prepare training data
training_data = spark.sql("""
  SELECT
    zone_id,
    date,
    hour,
    day_of_week,
    is_weekend,
    avg_circling_time,
    occupancy_percentage,
    LEAD(occupancy_percentage, 1) OVER (
      PARTITION BY zone_id ORDER BY timestamp
    ) AS next_hour_occupancy
  FROM gold.zone_metrics_hourly
  WHERE timestamp >= current_date() - INTERVAL 90 DAYS
""")

# AutoML for time-series forecasting
summary = automl.regress(
  dataset=training_data,
  target_col="next_hour_occupancy",
  primary_metric="rmse",
  timeout_minutes=30
)

# Register best model
best_model_uri = summary.best_trial.artifact_uri
model_name = "occupancy-predictor"
mlflow.register_model(best_model_uri, model_name)

# Deploy model as REST API
from mlflow.deployments import get_deploy_client

client = get_deploy_client("databricks")
client.create_endpoint(
  name="occupancy-prediction",
  config={
    "served_models": [{
      "model_name": model_name,
      "model_version": "1",
      "workload_size": "Small",
      "scale_to_zero_enabled": True
    }]
  }
)
```

#### Databricks Jobs (Orchestration)

```python
# Create job via Databricks REST API or UI

{
  "name": "ParkPal Analytics Pipeline",
  "tasks": [
    {
      "task_key": "ingest_bronze",
      "notebook_task": {
        "notebook_path": "/Workspace/ParkPal/02_bronze_ingestion"
      },
      "new_cluster": {
        "spark_version": "13.3.x-scala2.12",
        "node_type_id": "Standard_DS3_v2",
        "num_workers": 2,
        "autotermination_minutes": 10
      }
    },
    {
      "task_key": "transform_silver",
      "depends_on": [{"task_key": "ingest_bronze"}],
      "notebook_task": {
        "notebook_path": "/Workspace/ParkPal/03_silver_transformation"
      }
    },
    {
      "task_key": "aggregate_gold",
      "depends_on": [{"task_key": "transform_silver"}],
      "notebook_task": {
        "notebook_path": "/Workspace/ParkPal/04_gold_aggregations"
      }
    },
    {
      "task_key": "ml_predictions",
      "depends_on": [{"task_key": "aggregate_gold"}],
      "notebook_task": {
        "notebook_path": "/Workspace/ParkPal/05_ml_occupancy_prediction"
      }
    }
  ],
  "schedule": {
    "quartz_cron_expression": "0 0 * * * ?",  # Hourly
    "timezone_id": "Asia/Manila"
  }
}
```

#### Query Gold Tables from Backend API

```javascript
// backend/services/databricks.js
const axios = require('axios');

const DATABRICKS_HOST = process.env.DATABRICKS_HOST;
const DATABRICKS_TOKEN = process.env.DATABRICKS_TOKEN;
const SQL_WAREHOUSE_ID = process.env.SQL_WAREHOUSE_ID;

async function queryZoneMetrics(zoneId) {
  const query = `
    SELECT
      timestamp,
      avg_circling_time,
      occupancy_percentage,
      total_sessions,
      total_revenue
    FROM gold.zone_metrics_hourly
    WHERE zone_id = ${zoneId}
    AND timestamp >= current_timestamp() - INTERVAL 7 DAYS
    ORDER BY timestamp DESC
  `;

  const response = await axios.post(
    `${DATABRICKS_HOST}/api/2.0/sql/statements/`,
    {
      warehouse_id: SQL_WAREHOUSE_ID,
      statement: query,
      wait_timeout: '30s'
    },
    {
      headers: {
        'Authorization': `Bearer ${DATABRICKS_TOKEN}`
      }
    }
  );

  return response.data.result.data_array;
}

module.exports = { queryZoneMetrics };
```

#### Cost Optimization

```python
# Auto-terminate clusters after inactivity
spark.conf.set("spark.databricks.cluster.terminationInactivityTimeoutMinutes", "10")

# Use spot instances for non-critical jobs
{
  "cluster": {
    "aws_attributes": {
      "availability": "SPOT_WITH_FALLBACK",
      "zone_id": "auto"
    }
  }
}

# Delta table optimization (reduces query costs)
spark.sql("OPTIMIZE gold.zone_metrics_hourly")
spark.sql("VACUUM gold.zone_metrics_hourly RETAIN 168 HOURS")  # Keep 7 days
```

---

### 5. Orchestration - Databricks Workflows (No ADF Needed!)

**Since you're a Databricks expert, skip ADF entirely!**

Databricks Workflows can handle:
- ✅ Job scheduling
- ✅ Task dependencies
- ✅ Error handling & retries
- ✅ Monitoring & alerting
- ✅ Multi-task orchestration

**All orchestration in Databricks = Simpler stack, lower cost**

**Complete Workflow Definition:**

```python
# Create workflow programmatically via Databricks API
import requests
import json

databricks_host = "https://adb-<workspace-id>.azuredatabricks.net"
databricks_token = "<your-token>"

workflow = {
  "name": "ParkPal Analytics Pipeline",
  "email_notifications": {
    "on_failure": ["your-email@example.com"]
  },
  "timeout_seconds": 7200,
  "max_concurrent_runs": 1,
  "tasks": [
    # Task 1: Streaming ingestion (continuous)
    {
      "task_key": "streaming_ingestion",
      "notebook_task": {
        "notebook_path": "/Workspace/ParkPal/02_bronze_ingestion",
        "base_parameters": {}
      },
      "job_cluster_key": "streaming_cluster",
      "timeout_seconds": 0  # Run indefinitely
    },

    # Task 2: Hourly batch processing
    {
      "task_key": "hourly_aggregation",
      "notebook_task": {
        "notebook_path": "/Workspace/ParkPal/04_gold_aggregations",
        "base_parameters": {
          "window": "1 hour"
        }
      },
      "job_cluster_key": "batch_cluster"
    },

    # Task 3: Update ML model (daily)
    {
      "task_key": "ml_training",
      "depends_on": [{"task_key": "hourly_aggregation"}],
      "notebook_task": {
        "notebook_path": "/Workspace/ParkPal/05_ml_occupancy_prediction"
      },
      "job_cluster_key": "ml_cluster"
    },

    # Task 4: Data quality checks
    {
      "task_key": "data_quality",
      "depends_on": [{"task_key": "hourly_aggregation"}],
      "notebook_task": {
        "notebook_path": "/Workspace/ParkPal/06_data_quality_checks"
      },
      "job_cluster_key": "batch_cluster"
    }
  ],

  "job_clusters": [
    # Streaming cluster (always on for real-time)
    {
      "job_cluster_key": "streaming_cluster",
      "new_cluster": {
        "spark_version": "13.3.x-scala2.12",
        "node_type_id": "Standard_DS3_v2",
        "num_workers": 2,
        "autoscale": None,
        "spark_conf": {
          "spark.databricks.delta.preview.enabled": "true"
        }
      }
    },

    # Batch cluster (auto-terminate)
    {
      "job_cluster_key": "batch_cluster",
      "new_cluster": {
        "spark_version": "13.3.x-scala2.12",
        "node_type_id": "Standard_DS3_v2",
        "autoscale": {
          "min_workers": 2,
          "max_workers": 8
        },
        "autotermination_minutes": 10
      }
    },

    # ML cluster (with ML runtime)
    {
      "job_cluster_key": "ml_cluster",
      "new_cluster": {
        "spark_version": "13.3.x-cpu-ml-scala2.12",
        "node_type_id": "Standard_DS4_v2",
        "num_workers": 4,
        "autotermination_minutes": 10
      }
    }
  ],

  # Schedule: Hourly for batch, continuous for streaming
  "schedule": {
    "quartz_cron_expression": "0 0 * * * ?",  # Every hour
    "timezone_id": "Asia/Manila",
    "pause_status": "UNPAUSED"
  }
}

# Create job
response = requests.post(
  f"{databricks_host}/api/2.1/jobs/create",
  headers={"Authorization": f"Bearer {databricks_token}"},
  json=workflow
)

job_id = response.json()["job_id"]
print(f"Created job: {job_id}")
```

**Workflow Visualization in Databricks UI:**

```
┌─────────────────────────────────────────────────────┐
│  ParkPal Analytics Pipeline (Hourly)                │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Streaming Ingestion] (Continuous)                 │
│         ↓                                            │
│  [Hourly Aggregation] (Every hour)                  │
│         ├────→ [Data Quality Checks]                │
│         └────→ [ML Model Training] (Daily)          │
│                                                      │
│  Auto-retries: 3                                     │
│  Alerts: Slack, Email                                │
│  Cost: Auto-terminate idle clusters                 │
└─────────────────────────────────────────────────────┘
```

**Monitoring & Alerts:**

```python
# Add Slack webhook for alerts
workflow["webhook_notifications"] = {
  "on_failure": [{
    "id": "slack-webhook",
    "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
  }]
}

# Add retry logic
for task in workflow["tasks"]:
  task["max_retries"] = 3
  task["min_retry_interval_millis"] = 60000  # 1 minute
```

**No ADF needed! Everything in Databricks. 🎯**

---

### 6. Machine Learning - Azure ML

**For prediction models (occupancy, circling time)**

```bash
# Create Azure ML workspace
az ml workspace create \
  --name parkpal-ml \
  --resource-group parkpal-rg \
  --location southeastasia
```

**Sample Training Pipeline (AutoML):**

```python
# train_occupancy_model.py
from azureml.core import Workspace, Dataset, Experiment
from azureml.train.automl import AutoMLConfig

ws = Workspace.from_config()

# Load data from Synapse
dataset = Dataset.get_by_name(ws, 'zone_occupancy_historical')

automl_config = AutoMLConfig(
    task='forecasting',
    primary_metric='normalized_root_mean_squared_error',
    training_data=dataset,
    label_column_name='occupancy_percentage',
    n_cross_validations=5,
    enable_early_stopping=True,
    forecasting_parameters={
        'time_column_name': 'timestamp',
        'max_horizon': 24,  # Predict 24 hours ahead
        'target_lags': [1, 2, 3, 7, 24],
        'target_rolling_window_size': 3
    }
)

experiment = Experiment(ws, 'occupancy-forecasting')
run = experiment.submit(automl_config)

# Deploy best model as web service
best_run, fitted_model = run.get_output()
model = run.register_model(model_name='occupancy-predictor')
```

---

### 7. B2B Dashboards - Power BI

**Embed Power BI in your web app for B2B customers**

```bash
# Create Power BI Embedded capacity
az powerbi embedded-capacity create \
  --name parkpal-pbi \
  --resource-group parkpal-rg \
  --location southeastasia \
  --sku-name A1  # ~$1/hour when running
```

**Power BI Report (Connect to Synapse):**

1. Open Power BI Desktop
2. Get Data → Azure → Azure Synapse Analytics
3. Enter server: `parkpal-synapse.sql.azuresynapse.net`
4. Select tables: `agg_zone_metrics_hourly`, `dim_zones`

**Sample Dashboard:**
- Page 1: Zone Performance Overview
  - Card: Avg Circling Time (last 30 days)
  - Line chart: Circling Time Trend
  - Bar chart: Top 5 busiest zones
- Page 2: Competitor Analysis
  - Scatter plot: Your zone vs competitors (circling time vs occupancy)
- Page 3: Revenue Optimization
  - Heatmap: Occupancy % by hour and day of week
  - Recommendation: Increase price during peak hours

**Embed in Web App:**

```javascript
// frontend/web/src/components/AnalyticsDashboard.jsx
import { PowerBIEmbed } from 'powerbi-client-react';

function AnalyticsDashboard({ operatorId }) {
  const embedConfig = {
    type: 'report',
    id: '<report-id>',
    embedUrl: '<embed-url>',
    accessToken: '<generate-from-backend>',
    tokenType: models.TokenType.Embed,
    filters: [
      {
        $schema: "http://powerbi.com/product/schema#basic",
        target: {
          table: "dim_zones",
          column: "operator_id"
        },
        operator: "In",
        values: [operatorId]  // Filter to operator's zones only
      }
    ]
  };

  return <PowerBIEmbed embedConfig={embedConfig} />;
}
```

---

## Azure DevOps CI/CD

**Create Pipeline (azure-pipelines.yml):**

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - backend/*

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Build
    jobs:
      - job: BuildBackend
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'

          - script: |
              cd backend
              npm ci
              npm run test
            displayName: 'Install and Test'

          - task: ArchiveFiles@2
            inputs:
              rootFolderOrFile: 'backend'
              includeRootFolder: false
              archiveType: 'zip'
              archiveFile: '$(Build.ArtifactStagingDirectory)/backend.zip'

          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)'
              ArtifactName: 'drop'

  - stage: Deploy
    dependsOn: Build
    jobs:
      - deployment: DeployToProduction
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: '<subscription>'
                    appName: 'parkpal-api'
                    package: '$(Pipeline.Workspace)/drop/backend.zip'

                - task: AzureAppServiceManage@0
                  inputs:
                    azureSubscription: '<subscription>'
                    Action: 'Restart Azure App Service'
                    WebAppName: 'parkpal-api'
```

---

## Cost Breakdown (Azure)

### Phase 1: Service 2 MVP

| Service | SKU | Cost/Month |
|---------|-----|------------|
| App Service (API) | B1 (Basic) | $13 |
| PostgreSQL | Burstable B1ms | $12 |
| Redis Cache | Basic C0 | $16 |
| Blob Storage | LRS (50GB) | $1 |
| Static Web App | Free | $0 |
| Expo EAS (mobile) | Production | $29 |
| **Total** | | **~$71/month** |

### Phase 2: With Analytics

| Additional Services | Cost/Month |
|---------------------|------------|
| Event Hubs | Standard (1 TU) | $22 |
| Stream Analytics | 1 SU | $81 |
| ADX | Dev cluster | $100 |
| Synapse (pause when not in use) | DW100c (8h/day) | $50 |
| Data Factory | 10 pipelines/day | $15 |
| Power BI Embedded | A1 (paused when not in use) | $20 |
| **Additional** | | **~$288** |
| **Total with Analytics** | | **~$359/month** |

**Cost Optimization Tips:**
- Pause Synapse when not querying (saves ~70%)
- Use ADX Dev cluster for testing
- Auto-scale App Service (scale down at night)
- Use cool/archive storage tiers for old data

---

## Migration Path

### Week 1: Deploy MVP
```bash
# Deploy to Azure
./deploy-azure-mvp.sh
```

### Weeks 2-6: Build Service 2 Features
- Develop locally
- Push to Azure DevOps
- Auto-deploy via pipelines

### Month 2: Add Analytics Infrastructure
- Set up Event Hubs
- Configure Stream Analytics
- Deploy ADX cluster
- Build ADF pipelines

### Month 3: B2B Dashboards
- Create Power BI reports
- Embed in web app
- Sell to operators! 💰

---

## Quick Start Script

Create `deploy-azure-mvp.sh`:

```bash
#!/bin/bash

# Configuration
RG="parkpal-rg"
LOCATION="southeastasia"
APP_NAME="parkpal-api"

# Create resource group
az group create --name $RG --location $LOCATION

# Deploy App Service
az appservice plan create --name parkpal-plan --resource-group $RG --is-linux --sku B1
az webapp create --name $APP_NAME --resource-group $RG --plan parkpal-plan --runtime "NODE:18-lts"

# Deploy PostgreSQL
az postgres flexible-server create \
  --name parkpal-db \
  --resource-group $RG \
  --location $LOCATION \
  --admin-user pgadmin \
  --admin-password "SecurePassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 14

# Deploy Redis
az redis create --name parkpal-cache --resource-group $RG --location $LOCATION --sku Basic --vm-size c0

# Deploy Storage
az storage account create --name parkpalstorage --resource-group $RG --location $LOCATION --sku Standard_LRS

# Configure App Service
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RG \
  --settings \
    NODE_ENV=production \
    DATABASE_URL="postgresql://pgadmin:SecurePassword123!@parkpal-db.postgres.database.azure.com/parkpal"

# Deploy code
cd backend
git remote add azure $(az webapp deployment source config-local-git --name $APP_NAME --resource-group $RG --query url -o tsv)
git push azure main

echo "Deployment complete! API URL: https://$APP_NAME.azurewebsites.net"
```

---

## Recommendation for You (Azure Data Engineer)

**Start with Azure!**

**Reasons:**
1. ✅ You already know the platform
2. ✅ Analytics stack is your expertise (ADF, Synapse, ADX, Power BI)
3. ✅ Can build Service 1 analytics from day 1
4. ✅ Cheaper than AWS for your use case (~$71/month MVP)
5. ✅ Azure DevOps for CI/CD (familiar)
6. ✅ Southeast Asia region (close to Philippines)

**Your Advantage:**
- Other developers struggle with analytics → You're an expert
- You can build the **most valuable feature** (B2B analytics) yourself
- Power BI dashboards = Instant B2B demo material

**Timeline:**
- **Week 1:** Deploy MVP to Azure (you can do this in 1 day)
- **Weeks 2-6:** Build Service 2 features
- **Month 2:** Add analytics (Event Hubs → ADX → Synapse)
- **Month 3:** Power BI dashboards → Sell to operators

**Let's deploy to Azure right now?** 🚀


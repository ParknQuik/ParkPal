# Service 1: Smart Parking Analytics - Complete Implementation Guide

**Last Updated:** January 4, 2026
**Status:** Planning (15% complete - Database only)
**Launch Target:** September 2026 (Phase 8)
**Tech Stack:** Databricks on GCP + PostgreSQL + Activity Recognition API

---

## Table of Contents

1. [Overview](#overview)
2. [How Circling Time Works](#how-circling-time-works)
3. [Edge Cases & Solutions](#edge-cases--solutions)
4. [Data Pipeline Architecture](#data-pipeline-architecture)
5. [Implementation Roadmap](#implementation-roadmap)

---

## Overview

### What is Service 1?

**Service 1 (Smart Parking Analytics)** is ParkPal's **B2B/B2G revenue engine** providing:
- Real-time parking availability via crowdsourced data
- Circling time calculation and predictions
- Occupancy analytics for parking operators
- City-wide congestion insights for governments

### Current State (Jan 2026)
- ✅ **Database:** 100% ready (5 analytics models implemented)
- ⚠️ **Backend:** 10% complete (zone CRUD only, no analytics logic)
- ❌ **Frontend:** 0% complete (no analytics UI)
- ❌ **Integrations:** 0% complete (no geofencing/activity recognition)

**Overall Completion: 15%**

### Strategy
Launch Service 2 (Marketplace) first → Build 5,000+ user base → Launch Service 1 analytics

---

## How Circling Time Works

### User Journey

```
1. Driver enters SM Mall parking zone (14:30:00)
   └─ Geofence detected → Start circling timer

2. Mobile app sends activity updates every 5-10 seconds
   └─ "IN_VEHICLE" (searching for parking)

3. Driver finds parking, car stops (14:37:30)
   └─ Activity changes to "STILL"
   └─ Backend confirms parking → Circling time = 7 min 30 sec

4. Hourly job aggregates all sessions for the zone
   └─ Average circling time for 14:00-15:00 = 7 minutes

5. Next user searches at 14:45
   └─ API returns: "Average 7 min to find parking"
```

### Technical Implementation

#### Step 1: Geofence Entry Detection

**Mobile App:**
```javascript
// Using Turf.js for point-in-polygon check
const userLocation = { lat: 14.5378, lon: 121.0213 };
const parkingComplexZone = {
  type: "Polygon",
  coordinates: [[[121.020, 14.537], [121.022, 14.537], ...]]
};

if (turf.booleanPointInPolygon(userLocation, parkingComplexZone)) {
  // Send to backend
  POST /api/v1/analytics/zone/enter
  {
    userId: 123,
    zoneId: 5,  // SM Mall of Asia parking
    latitude: 14.5378,
    longitude: 121.0213
  }
}
```

**Backend Creates Session:**
```javascript
const session = await prisma.parkingSession.create({
  data: {
    userId: 123,
    zoneId: 5,
    sessionType: 'commercial_activity',

    // START CIRCLING TIMER
    zoneEntryTime: new Date(),           // 14:30:00
    circlingStartTime: new Date(),       // 14:30:00

    status: 'searching',
    lastActivityStatus: 'IN_VEHICLE'
  }
});
```

---

#### Step 2: Activity Recognition Updates

**Mobile App (Every 5-10 seconds):**
```javascript
import { ActivityRecognition } from '@react-native-community/google-activity-recognition';

ActivityRecognition.startActivityUpdates((activity) => {
  // activity = {
  //   type: "IN_VEHICLE" | "STILL" | "ON_FOOT" | "WALKING"
  //   confidence: 85  // 0-100
  // }

  POST /api/v1/analytics/activity
  {
    userId: 123,
    sessionId: 456,
    activityType: activity.type,
    confidence: activity.confidence,
    latitude: currentLocation.lat,
    longitude: currentLocation.lon
  }
});
```

**Backend Logs Activity:**
```javascript
await prisma.activityEvent.create({
  data: {
    userId: 123,
    sessionId: 456,
    activityType: 'IN_VEHICLE',
    confidence: 85,
    latitude: 14.5378,
    longitude: 121.0213,
    timestamp: new Date()
  }
});
```

---

#### Step 3: Parking Confirmation Detection

**Timeline Example:**
- **14:30:00** - Entered zone (IN_VEHICLE)
- **14:32:15** - Still searching (IN_VEHICLE, 90%)
- **14:35:20** - Still searching (IN_VEHICLE, 88%)
- **14:37:30** - Found spot (STILL, 95%) ← **KEY MOMENT**
- **14:37:50** - Walking away (ON_FOOT, 92%)

**Backend Confirmation Logic:**
```javascript
if (
  (activityType === 'STILL' || activityType === 'ON_FOOT') &&
  confidence >= 80 &&
  previousActivity === 'IN_VEHICLE'
) {
  // PARKING CONFIRMED!
  const now = new Date(); // 14:37:50

  const circlingDuration = Math.floor(
    (now - session.circlingStartTime) / 1000
  );
  // (14:37:50 - 14:30:00) = 470 seconds = 7 min 50 sec

  await prisma.parkingSession.update({
    where: { id: 456 },
    data: {
      parkingConfirmationTime: now,
      circlingEndTime: now,
      circlingDurationSeconds: circlingDuration,
      status: 'parked'
    }
  });
}
```

---

#### Step 4: Hourly Aggregation (Databricks)

**Databricks Job (runs at :05 past every hour):**
```python
# Calculate metrics for SM Mall of Asia, 2pm hour (14:00-15:00)
sessions = spark.read.jdbc(
    url="jdbc:postgresql://...",
    table="""
        SELECT * FROM parking_sessions
        WHERE zone_id = 5
        AND parking_confirmation_time >= '2025-10-05 14:00:00'
        AND parking_confirmation_time < '2025-10-05 15:00:00'
        AND circling_duration_seconds IS NOT NULL
    """
)

# Aggregate
zone_metrics = sessions.groupBy("zone_id").agg(
    avg("circling_duration_seconds").alias("avg_circling_time"),
    percentile_approx("circling_duration_seconds", 0.5).alias("median"),
    min("circling_duration_seconds").alias("min_circling_time"),
    max("circling_duration_seconds").alias("max_circling_time"),
    count("id").alias("total_sessions")
)

# Write back to PostgreSQL
zone_metrics.write.jdbc(
    url="...",
    table="zone_metrics",
    mode="append"
)

# Update Redis cache
for row in zone_metrics.collect():
    redis.setex(
        f"zone:{row.zone_id}:circling_time",
        3600,  # 1-hour TTL
        int(row.avg_circling_time)
    )
```

---

#### Step 5: API Serving

**API Endpoint:**
```javascript
GET /api/v1/analytics/zones/5/availability

Response:
{
  zoneId: 5,
  name: "SM Mall of Asia Parking",
  totalSlots: 500,
  occupied: 347,
  available: 153,
  occupancyPercentage: 69.4,

  // KEY METRIC
  estimatedCirclingTime: 420,  // 7 minutes (from Redis cache)

  message: "Moderate traffic. Average 7 min to find parking.",
  dataFreshness: "2025-10-05T14:05:00Z"  // Last updated
}
```

---

## Edge Cases & Solutions

### Problem 1: Delayed Confirmation (Phone in Pocket)

**Scenario:**
- **14:30:00** - Enter zone (IN_VEHICLE)
- **14:37:30** - User parks, phone still in pocket
- **14:37:30-14:39:00** - Phone still detects IN_VEHICLE (false positive)
- **14:39:00** - User takes phone out → STILL detected (90 seconds late!)

**Naive Calculation:**
```javascript
circlingTime = 14:39:00 - 14:30:00 = 9 minutes (WRONG!)
// Actual circling time was only 7.5 minutes
```

#### Solution 1A: Retroactive Correction

**Look back 3 minutes to find FIRST transition:**

```javascript
async function confirmParking(sessionId, currentActivity) {
  // Get recent activity history (last 3 minutes)
  const recentActivities = await prisma.activityEvent.findMany({
    where: {
      sessionId: sessionId,
      timestamp: { gte: new Date(Date.now() - 3 * 60 * 1000) }
    },
    orderBy: { timestamp: 'desc' }
  });

  // Find the FIRST transition from IN_VEHICLE to STILL/ON_FOOT
  let actualParkingTime = new Date();

  for (let i = recentActivities.length - 1; i >= 0; i--) {
    const current = recentActivities[i];
    const previous = recentActivities[i + 1];

    if (
      previous?.activityType === 'IN_VEHICLE' &&
      (current.activityType === 'STILL' || current.activityType === 'ON_FOOT') &&
      current.confidence >= 70
    ) {
      actualParkingTime = current.timestamp;  // Use EARLIER time
      break;
    }
  }

  const circlingDuration = Math.floor(
    (actualParkingTime - session.circlingStartTime) / 1000
  );

  await prisma.parkingSession.update({
    where: { id: sessionId },
    data: {
      parkingConfirmationTime: actualParkingTime,  // 14:37:30, not 14:39:00
      circlingDurationSeconds: circlingDuration,
      status: 'parked'
    }
  });
}
```

**Result:** Correct circling time: 7.5 minutes (not 9 minutes)

---

#### Solution 1B: Confidence Decay Model

**Weight recent activities more heavily:**

```javascript
function calculateConfidenceScore(activities) {
  let score = 0;
  const now = Date.now();

  activities.forEach(activity => {
    const ageSeconds = (now - activity.timestamp) / 1000;

    // Decay confidence over time (newer = more important)
    const decayFactor = Math.exp(-ageSeconds / 60); // 1-minute half-life

    const weight = (activity.confidence / 100) * decayFactor;

    if (activity.activityType === 'STILL' || activity.activityType === 'ON_FOOT') {
      score += weight;
    } else if (activity.activityType === 'IN_VEHICLE') {
      score -= weight;
    }
  });

  // If score > 0.5, user is likely parked
  return score > 0.5;
}
```

---

### Problem 2: False Positives (Traffic Jams)

**Scenario:**
- **14:30:00** - Enter zone
- **14:33:00** - Traffic jam, car STILL for 45 seconds
- **14:33:45** - Activity: STILL (85%) → False parking detection!
- **14:34:00** - Traffic moves, back to IN_VEHICLE
- **14:38:00** - Actually parked

#### Solution 2A: Minimum STILL Duration

**Require 45+ seconds of STILL:**

```javascript
async function confirmParkingWithDuration(sessionId, activity) {
  if (activity.activityType !== 'STILL' && activity.activityType !== 'ON_FOOT') {
    return null;
  }

  const stillEvents = await prisma.activityEvent.findMany({
    where: {
      sessionId: sessionId,
      activityType: { in: ['STILL', 'ON_FOOT'] },
      timestamp: { gte: new Date(Date.now() - 2 * 60 * 1000) }
    },
    orderBy: { timestamp: 'asc' }
  });

  if (stillEvents.length === 0) return null;

  const firstStill = stillEvents[0].timestamp;
  const durationStill = (Date.now() - firstStill) / 1000;

  // Require 45+ seconds of STILL
  if (durationStill >= 45) {
    return confirmParking(sessionId, firstStill);
  }

  return null;
}
```

---

#### Solution 2B: Location Movement Threshold

**Check if user has moved < 10 meters in last minute:**

```javascript
import * as turf from '@turf/turf';

async function confirmParkingWithMovement(sessionId, currentLocation) {
  const recentActivities = await prisma.activityEvent.findMany({
    where: {
      sessionId: sessionId,
      timestamp: { gte: new Date(Date.now() - 60 * 1000) }
    },
    orderBy: { timestamp: 'asc' }
  });

  if (recentActivities.length < 2) return null;

  const firstLocation = turf.point([
    recentActivities[0].longitude,
    recentActivities[0].latitude
  ]);

  const lastLocation = turf.point([
    currentLocation.longitude,
    currentLocation.latitude
  ]);

  const distanceMeters = turf.distance(firstLocation, lastLocation, { units: 'meters' });

  // If moved < 10 meters in 60 seconds → Likely parked
  if (distanceMeters < 10) {
    const hasStillActivity = recentActivities.some(a =>
      a.activityType === 'STILL' || a.activityType === 'ON_FOOT'
    );

    if (hasStillActivity) {
      return confirmParking(sessionId, recentActivities[0].timestamp);
    }
  }

  return null;
}
```

---

### Problem 3: User Gives Up and Leaves

**Scenario:**
- **14:30:00** - Enter SM Mall parking (full)
- **14:42:00** - Give up, exit zone (never parked)

#### Solution 3: Zone Exit Detection

```javascript
// Mobile app detects zone exit
if (!turf.booleanPointInPolygon(userLocation, parkingComplexZone)) {
  POST /api/v1/analytics/zone/exit
  {
    sessionId: 456,
    exitTime: "2025-10-05T14:42:00Z",
    parked: false
  }
}

// Backend handler
async function handleZoneExit(sessionId, exitTime, parked) {
  if (!parked) {
    await prisma.parkingSession.update({
      where: { id: sessionId },
      data: {
        status: 'abandoned',
        circlingEndTime: exitTime,
        circlingDurationSeconds: Math.floor(
          (exitTime - session.circlingStartTime) / 1000
        ),
        excludeFromMetrics: true  // Don't count in average
      }
    });
  }
}
```

---

### Problem 4: App Backgrounded/Killed

**Scenario:**
- **14:30:00** - Enter zone, app active
- **14:35:00** - User closes app to take a call
- **14:35:00-14:40:00** - No activity updates
- **14:40:00** - App reopened, user already parked

#### Solution 4: Background Activity Recognition

```javascript
// React Native - Request background location permission
import BackgroundGeolocation from 'react-native-background-geolocation';

BackgroundGeolocation.ready({
  desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
  distanceFilter: 10,
  stopTimeout: 5,
  enableHeadless: true,  // Keep running when app killed
  activityRecognitionInterval: 10000  // Every 10 seconds
});

// Even if app is backgrounded, continue sending updates
BackgroundGeolocation.on('activitychange', (activity) => {
  fetch('/api/v1/analytics/activity', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: currentSessionId,
      activityType: activity.activity,
      confidence: activity.confidence
    })
  });
});
```

---

### Recommended: Hybrid Approach

**Combine multiple techniques:**

```javascript
class ParkingDetectionService {

  async detectParking(sessionId, currentActivity, currentLocation) {
    // Step 1: Check activity pattern (40% weight)
    const activityScore = await this.checkActivityPattern(sessionId);

    // Step 2: Check location movement (30% weight)
    const movementScore = await this.checkLocationMovement(sessionId, currentLocation);

    // Step 3: Check duration of STILL (30% weight)
    const durationScore = await this.checkStillDuration(sessionId);

    // Combined confidence score
    const totalScore = (
      activityScore * 0.4 +
      movementScore * 0.3 +
      durationScore * 0.3
    );

    if (totalScore >= 0.75) {
      // High confidence - user is parked
      const parkingTime = await this.findEarliestParkingIndicator(sessionId);
      return await this.confirmParking(sessionId, parkingTime);
    }

    return null;
  }
}
```

**Expected Accuracy:** 85-95% for high-quality sessions

---

## Data Pipeline Architecture

### Pipeline Overview

```
PostgreSQL (continuous writes)
  ↓ (Hourly JDBC pull at :05 past every hour)
Databricks
  ↓ Bronze: Raw Parquet files on GCS
  ↓ Silver: Cleaned & validated
  ↓ Gold: Aggregated metrics
  ↓
PostgreSQL + Redis (API serving)
```

**Latency:** 1 hour (perfectly acceptable for parking predictions!)
**Cost:** $50-80/month (Databricks)

---

### Hourly Batch Job (Databricks)

**Runs at:** 00:05, 01:05, 02:05, ..., 23:05 every day

```python
from pyspark.sql import functions as F
from datetime import datetime, timedelta

# Calculate the previous hour window
now = datetime.now()
hour_start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
hour_end = now.replace(minute=0, second=0, microsecond=0)

# 1. EXTRACT: Read from PostgreSQL (last hour's data)
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
parking_sessions.write.mode("append").partitionBy("year", "month", "day", "hour").parquet(
    "gs://parkpal-data-lake/bronze/parking_sessions/"
)

# 3. TRANSFORM to Silver (Cleaned)
silver_sessions = (
    parking_sessions
        .filter("circling_duration_seconds BETWEEN 0 AND 3600")  # 0-60 min valid
        .filter("data_quality IN ('high', 'medium')")  # Exclude low quality
)

# 4. AGGREGATE to Gold (Business metrics)
zone_metrics = (
    silver_sessions
        .groupBy("zone_id")
        .agg(
            F.avg("circling_duration_seconds").alias("avg_circling_time_seconds"),
            F.expr("percentile_approx(circling_duration_seconds, 0.5)").alias("median"),
            F.min("circling_duration_seconds").alias("min_circling_time_seconds"),
            F.max("circling_duration_seconds").alias("max_circling_time_seconds"),
            F.count("id").alias("total_sessions")
        )
        .withColumn("timestamp", F.lit(hour_start))
        .withColumn("period_type", F.lit("hourly"))
)

# 5. WRITE BACK to PostgreSQL (for API)
zone_metrics.write.format("jdbc").option("url", "...").option("dbtable", "zone_metrics").mode("append").save()

# 6. UPDATE Redis Cache (for ultra-fast API)
import redis
r = redis.Redis(host='10.0.0.10', port=6379)

for row in zone_metrics.collect():
    key = f"zone:{row.zone_id}:circling_time"
    r.setex(key, 3600, int(row.avg_circling_time_seconds))
```

---

### Why Hourly Batch Makes Sense

**Crowdsourced Data:**
- Thousands of users contribute continuously
- Data arrives 24/7

**Use Case:**
- Drivers care about "average circling time in the last hour"
- NOT "last 5 minutes" (too noisy, small sample size)

**Cost-Effective:**
- Hourly: $50-80/month
- Real-time streaming: $360-500/month

**Example User Experience:**
```
User searches: "SM Mall of Asia parking" at 2:35 PM
API returns: "Average 7 min to find parking (based on 2:00-3:00 PM data)"
Data freshness: 35 minutes old → Totally acceptable!
```

---

## Implementation Roadmap

### Phase 6: Analytics Foundation (12 weeks - Mar-May 2026)

#### Week 1-4: Geofencing & Activity Recognition (Mar 3-28)

**Backend:**
- [ ] Geofencing service (Turf.js)
- [ ] Activity Recognition API integration
- [ ] Parking session tracking
- [ ] Circling time calculation

**Mobile:**
- [ ] Geofencing implementation
- [ ] Activity Recognition SDK
- [ ] Background location tracking
- [ ] Privacy controls

**Deliverables:**
- 5+ test zones operational
- 100+ test sessions tracked
- 85%+ parking detection accuracy

---

#### Week 5-8: Data Pipeline & Databricks (Mar 31 - Apr 25)

**Databricks:**
- [ ] GCP Databricks workspace
- [ ] GCS bucket (`gs://parkpal-data-lake/`)
- [ ] Bronze/Silver/Gold schemas
- [ ] Hourly batch pipeline

**Deliverables:**
- Hourly pipeline operational
- 1,000+ sessions/day processed
- Zone metrics updated hourly

**Cost:** $50-80/month

---

#### Week 9-12: Analytics API & UI (Apr 28 - May 22)

**Backend API:**
- [ ] Zone availability endpoint
- [ ] Zone metrics endpoint
- [ ] Prediction API

**Mobile UI:**
- [ ] Zone availability map overlay
- [ ] Parking complex detail screen
- [ ] Historical circling time chart

**Web Dashboard:**
- [ ] Zone metrics dashboard
- [ ] Occupancy trends
- [ ] Export to CSV

**Deliverables:**
- Analytics API operational
- Mobile analytics overlay live
- Basic web dashboard

---

### Phase 7: IoT & ML (8 weeks - Jun-Jul 2026)

**IoT Sensors:**
- [ ] 10+ ultrasonic sensors deployed
- [ ] MQTT → PostgreSQL pipeline
- [ ] Real-time occupancy updates

**ML Models:**
- [ ] Circling time predictor (XGBoost)
- [ ] Occupancy forecasting (Prophet)
- [ ] Demand prediction

**Deliverables:**
- 10+ sensors operational
- 3 ML models deployed
- 80%+ prediction accuracy

**Cost:** $500 hardware + $150/month

---

### Phase 8: B2B Launch (8 weeks - Aug-Sep 2026)

**B2B Portal:**
- [ ] Operator authentication
- [ ] Multi-zone dashboard
- [ ] Advanced analytics
- [ ] API products

**Pilot Customers:**
- [ ] 3-5 parking operators signed
- [ ] ₱100k-300k MRR

**Deliverables:**
- B2B product launched
- 5+ pilot customers
- ₱150k+ monthly revenue

---

## Success Metrics

### Phase 6 (May 2026)
- ✅ 10+ zones tracked
- ✅ 1,000+ sessions/day
- ✅ 85%+ parking detection accuracy
- ✅ < $100/month costs

### Phase 7 (Jul 2026)
- ✅ 10+ sensors deployed
- ✅ 3 ML models in production
- ✅ 80%+ prediction accuracy

### Phase 8 (Sep 2026)
- ✅ 5+ B2B customers
- ✅ ₱150k+ MRR
- ✅ B2B portal operational

---

## API Reference

### Zone Entry
```http
POST /api/v1/analytics/zone/enter
Content-Type: application/json

{
  "userId": 123,
  "zoneId": 5,
  "latitude": 14.5378,
  "longitude": 121.0213
}

Response:
{
  "sessionId": 456,
  "circlingStartTime": "2025-10-05T14:30:00Z"
}
```

### Activity Update
```http
POST /api/v1/analytics/activity
Content-Type: application/json

{
  "userId": 123,
  "sessionId": 456,
  "activityType": "IN_VEHICLE",
  "confidence": 85,
  "latitude": 14.5380,
  "longitude": 121.0215
}

Response:
{
  "status": "ok"
}
```

### Get Zone Availability
```http
GET /api/v1/analytics/zones/5/availability

Response:
{
  "zoneId": 5,
  "name": "SM Mall of Asia Parking",
  "totalSlots": 500,
  "occupied": 347,
  "available": 153,
  "occupancyPercentage": 69.4,
  "estimatedCirclingTime": 420,
  "message": "Moderate traffic. Average 7 min to find parking."
}
```

### Get Zone Metrics
```http
GET /api/v1/analytics/zones/5/metrics?period=hourly&from=2025-10-01&to=2025-10-07

Response:
[
  {
    "timestamp": "2025-10-05T14:00:00Z",
    "avgCirclingTime": 420,
    "occupancyPercentage": 69.4,
    "totalSessions": 145,
    "revenue": 12500
  },
  ...
]
```

---

## Related Documentation

- **`MASTER_ROADMAP_2026.md`** - Complete 12-month roadmap
- **`TECH_STACK_SUMMARY.md`** - Tech stack (Databricks on GCP)
- **`docs/PARKPAL_SYSTEM_ARCHITECTURE.md`** - Overall system architecture

---

**Last Updated:** January 4, 2026
**Status:** ✅ Architecture finalized, ready for Phase 6 (March 2026)

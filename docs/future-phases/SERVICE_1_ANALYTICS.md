# Service 1: Smart Parking Analytics

**Last Updated:** May 24, 2026
**Status:** Local MVP analytics foundation in progress; beta/deployment evidence remains deferred
**Timeline:** Local validation first, then beta MVP scope and launch gates
**Launch Target:** Beta MVP: June 2026 | Full B2B Launch: September 2026
**Investment:** $123,200 (~₱6.8M)
**Year 2 Revenue Projection:** ₱20M+ (~$364k)

---

## Overview

Service 1 is ParkPal's **B2B/B2G revenue engine**. While Service 2 is the P2P parking marketplace (current focus), Service 1 provides:

- Real-time parking availability via crowdsourced data
- Circling time calculation and predictions
- Occupancy analytics for parking operators
- City-wide congestion insights for governments

**Strategy:** Service 1 remains ParknQuik's B2B/B2G analytics product. The current local MVP should prove the zone, opt-in movement, and metrics loop before production beta commitments.

### Current Completion (May 24, 2026)

| Layer | Status | Notes |
|-------|--------|-------|
| Database | ✅ 100% | 5 analytics models implemented |
| Backend | ⚠️ In progress | Zone/session/activity APIs exist; Google-discovered parking candidate scan, review, and public discovery endpoints are implemented locally |
| Frontend | ⚠️ In progress | ExploreMap supports zone overlays and non-bookable candidate preview pins |
| Integrations | ⚠️ In progress | Mobile geofencing/opt-in analytics exists for verified zones; Google Places stays server-side for candidate discovery |

### Google Parking Facility Discovery

Google Places is an additive discovery source for known parking facilities, not a source of ParknQuik analytics or live availability. Server-side scans create internal `ParkingCandidate` records keyed by `googlePlaceId` and review metadata. Public Explore can show limited preview pins, but those pins must remain non-bookable and must not show pricing guarantees, occupancy, or circling-time estimates.

Analytics starts only after an admin/operator verifies the candidate geofence and links it to a ParknQuik-owned `Zone`. From that point, the existing opt-in movement loop can create zone-entry, zone-exit, parking-session, circling-time, and `ZoneMetrics` records against the verified zone.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Data collection | Google Activity Recognition API (mobile) |
| Data storage | PostgreSQL (operational) + GCP Cloud Storage (data lake) |
| Analytics platform | Databricks on GCP |
| Processing | Hourly batch (Bronze → Silver → Gold) |
| Serving | PostgreSQL + Redis cache |

---

## How It Works

### User Perspective

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

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      MOBILE APPS                             │
│  • Google Activity Recognition (every 5-10s)                │
│  • Geofencing (zone entry/exit detection)                   │
│  • GPS location tracking                                    │
└────────────────────┬────────────────────────────────────────┘
                     │ POST /api/analytics/activity
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND API (Node.js)                       │
│  • Create parking sessions                                  │
│  • Store activity events                                    │
│  • Detect parking confirmation                              │
│  • Calculate circling duration                              │
└────────────────────┬────────────────────────────────────────┘
                     │ Continuous writes
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              POSTGRESQL (Operational DB)                     │
│  • parking_sessions (hot data)                              │
│  • activity_events (raw events)                             │
│  • zone_metrics (aggregated - API serving)                  │
└────────────────────┬────────────────────────────────────────┘
                     │ Hourly JDBC pull (at :05 past every hour)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            DATABRICKS (Analytics Platform)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ BRONZE: Raw data (Parquet on GCS)                    │  │
│  └─────────────────────┬────────────────────────────────┘  │
│  ┌─────────────────────┴────────────────────────────────┐  │
│  │ SILVER: Cleaned & validated                          │  │
│  │  • Remove circling times < 0 or > 60 min             │  │
│  │  • Filter low-quality data, deduplicate              │  │
│  └─────────────────────┬────────────────────────────────┘  │
│  ┌─────────────────────┴────────────────────────────────┐  │
│  │ GOLD: Business metrics                               │  │
│  │  • Avg/median/min/max circling time per zone         │  │
│  │  • Occupancy percentage                              │  │
│  │  • ML predictions                                    │  │
│  └─────────────────────┬────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────┘
                         │ Write back aggregates
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         POSTGRESQL + REDIS (API Serving Layer)               │
│  • PostgreSQL: zone_metrics table (persistent)              │
│  • Redis: zone:123:circling_time (1-hour TTL cache)         │
└────────────────────┬────────────────────────────────────────┘
                     │ GET /api/analytics/zones/123/availability
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     MOBILE/WEB APPS                          │
│  Display: "Average 7 min to find parking"                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Step 1: Geofence Entry Detection

**Mobile App:**
```javascript
import * as turf from '@turf/turf';

const userLocation = { lat: 14.5378, lon: 121.0213 };
const parkingComplexZone = {
  type: "Polygon",
  coordinates: [[[121.020, 14.537], [121.022, 14.537], ...]]
};

if (turf.booleanPointInPolygon(userLocation, parkingComplexZone)) {
  POST /api/v1/analytics/zone/enter
  { userId: 123, zoneId: 5, latitude: 14.5378, longitude: 121.0213 }
}
```

**Backend creates session:**
```javascript
const session = await prisma.parkingSession.create({
  data: {
    userId: 123,
    zoneId: 5,
    sessionType: 'commercial_activity',
    zoneEntryTime: new Date(),
    circlingStartTime: new Date(),
    status: 'searching',
    lastActivityStatus: 'IN_VEHICLE'
  }
});
```

### Step 2: Activity Recognition Updates

**Mobile App (every 5-10 seconds):**
```javascript
import { ActivityRecognition } from '@react-native-community/google-activity-recognition';

ActivityRecognition.startActivityUpdates((activity) => {
  POST /api/v1/analytics/activity
  {
    userId: 123,
    sessionId: 456,
    activityType: activity.type,  // "IN_VEHICLE" | "STILL" | "ON_FOOT"
    confidence: activity.confidence,
    latitude: currentLocation.lat,
    longitude: currentLocation.lon
  }
});
```

### Step 3: Parking Confirmation

**Timeline example:**
- 14:30:00 — Entered zone (IN_VEHICLE)
- 14:32:15 — Still searching (IN_VEHICLE, 90%)
- 14:37:30 — Found spot (STILL, 95%) ← key moment
- 14:37:50 — Walking away (ON_FOOT, 92%)

**Backend confirmation logic:**
```javascript
if (
  (activityType === 'STILL' || activityType === 'ON_FOOT') &&
  confidence >= 80 &&
  previousActivity === 'IN_VEHICLE'
) {
  const circlingDuration = Math.floor((now - session.circlingStartTime) / 1000);

  await prisma.parkingSession.update({
    where: { id: 456 },
    data: {
      parkingConfirmationTime: now,
      circlingDurationSeconds: circlingDuration,
      status: 'parked'
    }
  });
}
```

### Step 4: Hourly Aggregation (Databricks)

Runs at :05 past every hour.

```python
from pyspark.sql import functions as F
from datetime import datetime, timedelta

now = datetime.now()
hour_start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
hour_end = now.replace(minute=0, second=0, microsecond=0)

# 1. Extract from PostgreSQL
parking_sessions = (
    spark.read.format("jdbc")
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

# 2. Bronze: raw data lake on GCS
parking_sessions.write.mode("append").partitionBy("year", "month", "day", "hour").parquet(
    "gs://parkpal-data-lake/bronze/parking_sessions/"
)

# 3. Silver: cleaned
silver_sessions = (
    parking_sessions
    .filter("circling_duration_seconds BETWEEN 0 AND 3600")
    .filter("data_quality IN ('high', 'medium')")
)

# 4. Gold: aggregated metrics
zone_metrics = (
    silver_sessions.groupBy("zone_id").agg(
        F.avg("circling_duration_seconds").alias("avg_circling_time_seconds"),
        F.expr("percentile_approx(circling_duration_seconds, 0.5)").alias("median"),
        F.min("circling_duration_seconds").alias("min_circling_time_seconds"),
        F.max("circling_duration_seconds").alias("max_circling_time_seconds"),
        F.count("id").alias("total_sessions")
    )
    .withColumn("timestamp", F.lit(hour_start))
    .withColumn("period_type", F.lit("hourly"))
)

# 5. Write back to PostgreSQL + Redis
zone_metrics.write.format("jdbc").option("dbtable", "zone_metrics").mode("append").save()

for row in zone_metrics.collect():
    redis.setex(f"zone:{row.zone_id}:circling_time", 3600, int(row.avg_circling_time_seconds))
```

---

## Edge Cases & Solutions

### Problem 1: Delayed Confirmation (Phone in Pocket)

**Scenario:** User parks at 14:37:30 but phone is in pocket. STILL activity detected at 14:39:00 — 90 seconds late.

**Solution A — Retroactive correction:** Look back 3 minutes for the first STILL transition.
```javascript
const recentActivities = await prisma.activityEvent.findMany({
  where: { sessionId, timestamp: { gte: new Date(Date.now() - 3 * 60 * 1000) } },
  orderBy: { timestamp: 'desc' }
});

let actualParkingTime = new Date();
for (let i = recentActivities.length - 1; i >= 0; i--) {
  const current = recentActivities[i];
  const previous = recentActivities[i + 1];
  if (
    previous?.activityType === 'IN_VEHICLE' &&
    (current.activityType === 'STILL' || current.activityType === 'ON_FOOT') &&
    current.confidence >= 70
  ) {
    actualParkingTime = current.timestamp;
    break;
  }
}
```

**Solution B — Confidence decay model:** Weight newer activities more heavily.
```javascript
function calculateConfidenceScore(activities) {
  let score = 0;
  const now = Date.now();

  activities.forEach(activity => {
    const ageSeconds = (now - activity.timestamp) / 1000;
    const decayFactor = Math.exp(-ageSeconds / 60); // 1-minute half-life
    const weight = (activity.confidence / 100) * decayFactor;

    if (activity.activityType === 'STILL' || activity.activityType === 'ON_FOOT') {
      score += weight;
    } else if (activity.activityType === 'IN_VEHICLE') {
      score -= weight;
    }
  });

  return score > 0.5; // true = likely parked
}
```

---

### Problem 2: False Positives (Traffic Jams)

**Scenario:** Car stops in traffic for 45 seconds → STILL detected → false parking confirmation.

**Solution A — Minimum STILL duration (45+ seconds):**
```javascript
const firstStill = stillEvents[0].timestamp;
const durationStill = (Date.now() - firstStill) / 1000;
if (durationStill >= 45) {
  return confirmParking(sessionId, firstStill);
}
```

**Solution B — Location movement threshold (<10m in last minute):**
```javascript
const distanceMeters = turf.distance(firstLocation, lastLocation, { units: 'meters' });
if (distanceMeters < 10 && hasStillActivity) {
  return confirmParking(sessionId, recentActivities[0].timestamp);
}
```

---

### Problem 3: User Gives Up and Leaves

**Scenario:** User enters zone, can't find parking, exits without parking.

**Solution — Zone exit detection:**
```javascript
// Mobile detects zone exit
if (!turf.booleanPointInPolygon(userLocation, parkingComplexZone)) {
  POST /api/v1/analytics/zone/exit
  { sessionId: 456, exitTime: "...", parked: false }
}

// Backend marks session as abandoned (excluded from metrics)
await prisma.parkingSession.update({
  where: { id: sessionId },
  data: { status: 'abandoned', excludeFromMetrics: true }
});
```

---

### Problem 4: App Backgrounded or Killed

**Solution — Background geolocation:**
```javascript
import BackgroundGeolocation from 'react-native-background-geolocation';

BackgroundGeolocation.ready({
  desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
  distanceFilter: 10,
  enableHeadless: true,  // Keep running when app is killed
  activityRecognitionInterval: 10000
});
```

---

### Recommended: Hybrid Detection (Best Accuracy)

Combine all three signals with weighted confidence:

```javascript
class ParkingDetectionService {
  async detectParking(sessionId, currentActivity, currentLocation) {
    const activityScore  = await this.checkActivityPattern(sessionId);   // 40% weight
    const movementScore  = await this.checkLocationMovement(sessionId, currentLocation); // 30%
    const durationScore  = await this.checkStillDuration(sessionId);     // 30%

    const totalScore = activityScore * 0.4 + movementScore * 0.3 + durationScore * 0.3;

    if (totalScore >= 0.75) {
      const parkingTime = await this.findEarliestParkingIndicator(sessionId);
      return await this.confirmParking(sessionId, parkingTime);
    }
    return null;
  }
}
```

**Expected accuracy:** 85-95% for high-quality sessions.

| Edge Case | Solution | Accuracy Impact |
|-----------|----------|----------------|
| Delayed confirmation | Retroactive 3-min lookback | ±30-90 sec |
| Traffic jam false positive | 45s STILL + <10m movement | 90%+ accuracy |
| User gives up | Zone exit → flag as abandoned | Excluded from metrics |
| App backgrounded | Background geolocation | Flagged as low quality |

---

## Why Hourly Batch (Not Real-Time)

**User behavior:** Drivers check parking availability before driving, not while actively circling. 1-hour-old data is perfectly useful. Real-time data would actually be noisier with fewer samples.

| Window | Sample size | Confidence | Value |
|--------|------------|-----------|-------|
| Hourly | 50-200 sessions/zone | High | ✅ Useful |
| 5-minute | 4-15 sessions | Low, noisy | ❌ Not actionable |
| Real-time | <5 sessions | Very low | ❌ Irrelevant |

**Cost comparison:**
- Hourly batch: $50-80/month
- Real-time streaming: $360-500/month

---

## Monthly Cost Estimate (5,000 users, 50k sessions/day)

| Component | Cost |
|-----------|------|
| PostgreSQL (Cloud SQL) | $100 |
| GCP Cloud Storage (500 GB) | $10 |
| Databricks (hourly jobs) | $50-80 |
| Redis Cache (1 GB) | $20 |
| **Total** | **$180-210/month** |

---

## API Reference

### Zone Entry
```http
POST /api/v1/analytics/zone/enter
{ "userId": 123, "zoneId": 5, "latitude": 14.5378, "longitude": 121.0213 }

Response: { "sessionId": 456, "circlingStartTime": "2026-10-05T14:30:00Z" }
```

### Activity Update
```http
POST /api/v1/analytics/activity
{ "userId": 123, "sessionId": 456, "activityType": "IN_VEHICLE", "confidence": 85, "latitude": 14.5380, "longitude": 121.0215 }

Response: { "status": "ok" }
```

### Zone Availability
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
  "message": "Moderate traffic. Average 7 min to find parking.",
  "dataFreshness": "2026-10-05T14:05:00Z"
}
```

### Zone Metrics
```http
GET /api/v1/analytics/zones/5/metrics?period=hourly&from=2026-10-01&to=2026-10-07

Response:
[
  {
    "timestamp": "2026-10-05T14:00:00Z",
    "avgCirclingTime": 420,
    "occupancyPercentage": 69.4,
    "totalSessions": 145,
    "revenue": 12500
  }
]
```

---

## Roadmap (REVISED — April 20, 2026)

### 🚨 Why This Changed
Analytics is not an optional feature — it's the **core differentiator**. Parking search is a commodity. Real-time circling time predictions and occupancy data are what makes ParkPal worth paying for. Beta users need to experience this.

---

### Phase 6A: Beta MVP — Analytics Foundation (4 weeks — May 1-28, 2026)

This is the minimum viable analytics that must be in beta.

**Week 1-2: Backend Analytics Endpoints**
- [ ] `POST /api/v1/analytics/zone/enter` — create parking session
- [ ] `POST /api/v1/analytics/activity` — receive activity updates
- [ ] `POST /api/v1/analytics/zone/exit` — close session
- [ ] `GET /api/v1/analytics/zones/:id/availability` — serve cached metrics
- [ ] `GET /api/v1/analytics/zones` — list all zones
- [x] Admin-only Google parking-candidate scan and review endpoints
- [x] Public discovery endpoint for non-bookable candidate preview pins
- [ ] Parking detection scoring logic (hybrid: activity + movement + duration)
- [ ] Auto-expire sessions older than 2 hours

**Week 3-4: Mobile Integration**
- [ ] Geofencing service using Turf.js (zone entry/exit detection)
- [ ] Google Activity Recognition API integration (IN_VEHICLE, STILL, ON_FOOT)
- [ ] Background location tracking (`react-native-background-geolocation`)
- [ ] Privacy controls UI (opt-in/opt-out for analytics)
- [ ] Zone overlay on ExploreMap screen (show circling time estimate)
- [x] ExploreMap candidate pins that are visually distinct and non-bookable
- [ ] Parking complex detail screen (availability %, estimated time)

**Beta Deliverables (May 28, 2026):**
- 5+ test zones configured
- Analytics collecting real sessions from beta users
- Map shows "Avg X min to find parking" for zones
- 85%+ detection accuracy target

**Cost:** Free (uses existing PostgreSQL + Redis, no Databricks yet)

---

### Phase 6B: Data Pipeline (4 weeks — Jun 1-28, 2026)

After beta data starts flowing, build the processing layer.

**Week 5-6: Data Lake Setup**
- [ ] GCS bucket (`gs://parkpal-data-lake/`)
- [ ] Bronze/Silver/Gold schema definitions
- [ ] Manual batch script (run hourly via Cloud Scheduler)
- [ ] Data quality validation (filter < 0 or > 60 min sessions)

**Week 7-8: Analytics API & Dashboard**
- [ ] Hourly aggregation job (Cloud Scheduler → Cloud Run)
- [ ] Zone metrics API serving from Redis cache
- [ ] Mobile: circling time trends (7-day history)
- [ ] Web: zone metrics dashboard (occupancy trends, CSV export)
- [ ] Operator portal (basic) — view their zone's metrics

**Full Phase 6 Deliverables (Jun 28, 2026):**
- 1,000+ sessions/day processed
- Zone metrics updated hourly
- Operator portal live
- Monthly cost: < $100

---

### Phase 7: IoT & ML (8 weeks — Jul-Aug 2026)

- [ ] 10+ ultrasonic sensors deployed, MQTT → PostgreSQL pipeline
- [ ] ML models: circling time predictor (XGBoost), occupancy forecasting (Prophet)
- [ ] 80%+ prediction accuracy
- [ ] Databricks workspace setup (when data volume justifies cost)

**Cost:** $500 hardware + $150/month

---

### Phase 8: B2B Launch (8 weeks — Sep-Oct 2026)

- [ ] Operator authentication + multi-zone dashboard
- [ ] Advanced analytics + API products
- [ ] 3-5 pilot parking operators signed
- [ ] Target: ₱100k-300k MRR

---

## Revised Timeline Summary

| Phase | Original | Revised | Status |
|-------|----------|---------|--------|
| Phase 6A: Beta MVP | Mar 2026 | May 1-28, 2026 | ❌ Not started |
| Phase 6B: Full Pipeline | Apr 2026 | Jun 1-28, 2026 | ❌ Not started |
| Phase 7: IoT & ML | Jun-Jul 2026 | Jul-Aug 2026 | ❌ Not started |
| Phase 8: B2B Launch | Aug-Sep 2026 | Sep-Oct 2026 | ❌ Not started |

**Beta must include:** Phase 6A (backend endpoints + mobile geofencing + activity recognition)

---

## Success Metrics

| Phase | Metric | Target |
|-------|--------|--------|
| Phase 6A Beta (May 2026) | Zones tracked | 5+ |
| Phase 6A Beta | Sessions collected | 100+ |
| Phase 6A Beta | Detection accuracy | 85%+ |
| Phase 6A Beta | Monthly cost | $0 (no Databricks yet) |
| Phase 6 (Jun 2026) | Zones tracked | 10+ |
| Phase 6 | Sessions/day | 1,000+ |
| Phase 6 | Detection accuracy | 85%+ |
| Phase 6 | Monthly cost | < $100 |
| Phase 7 (Aug 2026) | Sensors deployed | 10+ |
| Phase 7 | Prediction accuracy | 80%+ |
| Phase 8 (Oct 2026) | B2B customers | 5+ |
| Phase 8 | Monthly revenue | ₱150k+ |

---

## Related Documentation

- `TECH_STACK_SUMMARY.md` — authoritative tech stack reference
- `docs/PARKPAL_SYSTEM_ARCHITECTURE.md` — overall system architecture
- `backend/ANALYTICS_TEST_STATUS.md` — current backend analytics test coverage

---

## 🚨 Action Required

**Analytics is the #1 priority for beta.** Without it, ParkPal ships as a commodity booking app with no differentiation.

**Owner:** Bryan Angelo Yaneza
**Next action:** Begin Phase 6A Week 1 backend endpoints immediately (target start: May 1, 2026)
**Hard deadline:** Beta must include working analytics — May 28, 2026

| Task | Owner | Due |
|------|-------|-----|
| Backend analytics endpoints (6A Week 1-2) | Bryan | May 14, 2026 |
| Mobile geofencing + activity recognition (6A Week 3-4) | Bryan | May 28, 2026 |
| Beta launch with analytics live | Bryan | May 28, 2026 |
| Data pipeline + operator portal (6B) | Bryan | Jun 28, 2026 |

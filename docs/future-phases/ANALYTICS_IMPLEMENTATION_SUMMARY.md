# Service 1 Analytics - Implementation Summary

**Date:** January 4, 2026
**Status:** Architecture finalized, ready for Phase 6 implementation

---

## Quick Reference

### **Goal:** Calculate and predict parking circling time for commercial complexes

### **Method:** Crowdsourced activity recognition from mobile app users

### **Tech Stack:**
- **Data Collection:** Google Activity Recognition API (mobile)
- **Data Storage:** PostgreSQL (operational), GCP Cloud Storage (data lake)
- **Analytics Platform:** Databricks on GCP
- **Processing:** Hourly batch jobs (Bronze → Silver → Gold)
- **Serving:** PostgreSQL + Redis cache

---

## How It Works (User Perspective)

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

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      MOBILE APPS                             │
│  • Google Activity Recognition (every 5-10s)                │
│  • Geofencing (zone entry/exit detection)                   │
│  • GPS location tracking                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ POST /api/analytics/activity
                     │ { sessionId, activityType, confidence }
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND API (Node.js)                       │
│  • Create parking sessions                                  │
│  • Store activity events                                    │
│  • Detect parking confirmation                              │
│  • Calculate circling duration                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Continuous writes
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              POSTGRESQL (Operational DB)                     │
│  • parking_sessions (hot data)                              │
│  • activity_events (raw events)                             │
│  • zone_metrics (aggregated - API serving)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Hourly JDBC pull (at :05 past every hour)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            DATABRICKS (Analytics Platform)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ BRONZE: Raw data (Parquet on GCS)                   │   │
│  │  └─ Last hour's parking sessions & activity events  │   │
│  └─────────────────────────────────────────────────────┘   │
│                         │                                    │
│  ┌─────────────────────┴───────────────────────────────┐   │
│  │ SILVER: Cleaned & validated                         │   │
│  │  • Remove circling times < 0 or > 60 min            │   │
│  │  • Filter low-quality data                          │   │
│  │  • Deduplicate records                              │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│  ┌─────────────────────┴───────────────────────────────┐   │
│  │ GOLD: Business metrics                              │   │
│  │  • Avg/median/min/max circling time per zone       │   │
│  │  • Occupancy percentage                             │   │
│  │  • Predictions (ML models)                          │   │
│  └─────────────────────┬───────────────────────────────┘   │
└────────────────────────┼────────────────────────────────────┘
                         │
                         │ Write back aggregates
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         POSTGRESQL + REDIS (API Serving Layer)               │
│  • PostgreSQL: zone_metrics table (persistent)              │
│  • Redis: zone:123:circling_time (1-hour TTL cache)         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ GET /api/analytics/zones/123/availability
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     MOBILE/WEB APPS                          │
│  Display: "Average 7 min to find parking"                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Implementation Details

### 1. Edge Case Handling

| Edge Case | Solution | Impact |
|-----------|----------|--------|
| Delayed confirmation (phone in pocket) | Look back 3 min for first STILL transition | ±30-90 sec accuracy |
| Traffic jam (false parking) | Require 45s STILL + <10m movement | 90%+ accuracy |
| User gives up (exits zone) | Zone exit detection → flag as "abandoned" | Exclude from metrics |
| App backgrounded | Background geolocation + estimated parking time | Flag as "low quality" |

**See:** `CIRCLING_TIME_EDGE_CASES.md` for full details

---

### 2. Data Pipeline (Hourly Batch)

```python
# Runs at: 00:05, 01:05, 02:05, ..., 23:05 every day

# STEP 1: Extract from PostgreSQL (last hour)
sessions = spark.read.jdbc(
    "SELECT * FROM parking_sessions WHERE parking_confirmation_time >= '{hour_start}'"
)

# STEP 2: Load to GCS (Bronze)
sessions.write.parquet("gs://parkpal-data-lake/bronze/parking_sessions/")

# STEP 3: Transform (Silver)
clean_sessions = sessions.filter("circling_duration_seconds BETWEEN 0 AND 3600")

# STEP 4: Aggregate (Gold)
zone_metrics = clean_sessions.groupBy("zone_id").agg(
    avg("circling_duration_seconds").alias("avg_circling_time")
)

# STEP 5: Write back to PostgreSQL + Redis
zone_metrics.write.jdbc(url="...", table="zone_metrics", mode="append")
redis.setex(f"zone:{zone_id}:circling_time", 3600, avg_circling_time)
```

**See:** `DATABRICKS_PIPELINE_ARCHITECTURE.md` for full implementation

---

## Cost Breakdown (5,000 users, 50k sessions/day)

| Component | Monthly Cost |
|-----------|--------------|
| PostgreSQL (Cloud SQL) | $100 |
| GCP Cloud Storage (500 GB) | $10 |
| Databricks (hourly jobs) | $50-80 |
| Redis Cache (1 GB) | $20 |
| **Total** | **$180-210/month** |

**Compare to near real-time streaming:** $360-500/month

---

## Why Hourly Batch is Sufficient

### User Behavior Analysis:

**Driver Journey:**
1. User decides to go to SM Mall (13:00)
2. Searches for parking info (13:15)
3. Drives to mall (13:30)
4. Enters parking zone (14:00)

**Key Insight:** Users check parking availability **before** driving there, not while actively circling.

**Data Freshness Requirements:**
- ✅ **1-hour old data:** "Average 7 min at 2-3 PM" → Useful!
- ❌ **5-min old data:** "Average 6.8 min at 2:30-2:35 PM" → Marginal value
- ❌ **Real-time data:** "Average 7.2 min in last 30 sec" → Irrelevant (too few samples)

### Statistical Validity:

**Hourly Window:**
- Sample size: 50-200 sessions per zone per hour
- Confidence: High (statistically significant)
- Stability: Average doesn't change much minute-to-minute

**5-Minute Window:**
- Sample size: 4-15 sessions
- Confidence: Low (high variance)
- Stability: Noisy, not actionable

---

## Deliverables (Phase 6 - 12 weeks)

### Week 1-4: Data Collection
- [ ] Implement geofencing (Turf.js)
- [ ] Integrate Google Activity Recognition API
- [ ] Backend endpoints for activity tracking
- [ ] Parking confirmation logic
- [ ] Edge case handling (delays, false positives)

### Week 5-8: Analytics Pipeline
- [ ] Setup Databricks on GCP
- [ ] Create Bronze/Silver/Gold schemas
- [ ] Hourly batch job (JDBC → GCS → Databricks)
- [ ] Write-back to PostgreSQL + Redis
- [ ] Databricks Workflow scheduling

### Week 9-12: API & Testing
- [ ] Analytics API endpoints
- [ ] Mobile/web UI for predictions
- [ ] Load testing (10k users)
- [ ] Data quality monitoring
- [ ] Documentation

---

## Success Metrics (Phase 6 Launch)

**Technical:**
- [ ] 85%+ parking detection accuracy
- [ ] < 1 hour data latency
- [ ] 99.9% job success rate
- [ ] < $100/month Databricks costs

**Business:**
- [ ] 1,000+ users contributing data
- [ ] 20+ parking zones tracked
- [ ] 10,000+ sessions/week processed
- [ ] Accurate predictions (±2 min of actual circling time)

---

## Next Steps

1. **Review this summary** + detailed docs
2. **Approve tech stack** (Databricks on GCP, hourly batch)
3. **Start Phase 6 implementation** (after Service 2 public launch in Feb 2026)

---

## Related Documentation

- **`CIRCLING_TIME_EDGE_CASES.md`** - Handling delayed confirmations, false positives
- **`DATABRICKS_PIPELINE_ARCHITECTURE.md`** - Full pipeline implementation
- **`SERVICE_1_ANALYTICS_ROADMAP.md`** - 28-week roadmap (Phases 6-8)
- **`TECH_STACK_SUMMARY.md`** - Authoritative tech stack reference
- **`docs/PARKPAL_SYSTEM_ARCHITECTURE.md`** - Overall system architecture

---

**Status:** ✅ Architecture finalized, ready for implementation after Service 2 launch

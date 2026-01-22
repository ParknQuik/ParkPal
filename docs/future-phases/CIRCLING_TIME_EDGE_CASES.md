# Circling Time Calculation - Edge Cases & Solutions

**Date:** January 4, 2026
**Purpose:** Handle delayed confirmations, false positives, and data quality issues

---

## Problem 1: Delayed Activity Confirmations

### Scenario 1: Phone in Pocket (Delayed STILL Detection)

**Timeline:**
- **14:30:00** - Enter zone (IN_VEHICLE)
- **14:37:30** - User parks, phone still in pocket
- **14:37:30-14:39:00** - Phone still detects IN_VEHICLE (false positive)
- **14:39:00** - User takes phone out → STILL detected (90 seconds late!)

**Naive Calculation:**
```javascript
circlingTime = 14:39:00 - 14:30:00 = 9 minutes (WRONG!)
// Actual circling time was only 7.5 minutes
```

### Solution 1A: Retroactive Correction with Activity Buffer

**Implementation:**
```javascript
// backend/services/circlingTimeCalculator.js

async function confirmParking(sessionId, currentActivity) {
  const session = await prisma.parkingSession.findUnique({
    where: { id: sessionId }
  });

  // Get recent activity history (last 3 minutes)
  const recentActivities = await prisma.activityEvent.findMany({
    where: {
      sessionId: sessionId,
      timestamp: {
        gte: new Date(Date.now() - 3 * 60 * 1000) // Last 3 minutes
      }
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
      current.confidence >= 70  // Lower threshold for historical data
    ) {
      actualParkingTime = current.timestamp;
      break;
    }
  }

  // Use the earliest detected transition, not the latest
  const circlingDuration = Math.floor(
    (actualParkingTime - session.circlingStartTime) / 1000
  );

  await prisma.parkingSession.update({
    where: { id: sessionId },
    data: {
      parkingConfirmationTime: actualParkingTime,  // Earlier time
      circlingEndTime: actualParkingTime,
      circlingDurationSeconds: circlingDuration,
      status: 'parked'
    }
  });

  return { circlingDuration, actualParkingTime };
}
```

**Result:**
- Detects that transition happened at 14:37:30 (not 14:39:00)
- Correct circling time: 7.5 minutes

---

### Solution 1B: Moving Average Window

**Implementation:**
```javascript
// Smooth out noise by using a sliding window

function detectParkingWithWindow(activities) {
  const windowSize = 3; // Last 3 activity events

  for (let i = 0; i < activities.length - windowSize; i++) {
    const window = activities.slice(i, i + windowSize);

    // If 2 out of 3 recent activities are STILL/ON_FOOT
    const nonVehicleCount = window.filter(a =>
      a.activityType === 'STILL' || a.activityType === 'ON_FOOT'
    ).length;

    if (nonVehicleCount >= 2) {
      // Return the timestamp of the FIRST non-vehicle activity in window
      const firstNonVehicle = window.find(a =>
        a.activityType === 'STILL' || a.activityType === 'ON_FOOT'
      );
      return firstNonVehicle.timestamp;
    }
  }

  return null; // Still searching
}
```

---

### Solution 1C: Confidence Decay Model

**Implementation:**
```javascript
// Weight recent activities more heavily

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

## Problem 2: False Positives (Traffic Jams)

### Scenario 2: Stuck in Traffic Inside Complex

**Timeline:**
- **14:30:00** - Enter zone
- **14:33:00** - Traffic jam, car STILL for 45 seconds
- **14:33:45** - Activity: STILL (confidence 85%) → False parking detection!
- **14:34:00** - Traffic moves, back to IN_VEHICLE
- **14:38:00** - Actually parked

**Naive Calculation:**
```javascript
// Detects parking at 14:33:45 (traffic jam)
circlingTime = 3 min 45 sec (WRONG!)
// Actual: 8 minutes
```

### Solution 2A: Minimum STILL Duration

**Implementation:**
```javascript
// Don't confirm parking unless STILL for at least 45-60 seconds

async function confirmParkingWithDuration(sessionId, activity) {
  if (activity.activityType !== 'STILL' && activity.activityType !== 'ON_FOOT') {
    return null; // Still in vehicle
  }

  // Get all STILL/ON_FOOT events in last 2 minutes
  const stillEvents = await prisma.activityEvent.findMany({
    where: {
      sessionId: sessionId,
      activityType: { in: ['STILL', 'ON_FOOT'] },
      timestamp: {
        gte: new Date(Date.now() - 2 * 60 * 1000)
      }
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

  return null; // Not parked yet
}
```

---

### Solution 2B: Location Movement Threshold

**Implementation:**
```javascript
// Check if user has moved < 10 meters in last minute

import * as turf from '@turf/turf';

async function confirmParkingWithMovement(sessionId, currentLocation) {
  const recentActivities = await prisma.activityEvent.findMany({
    where: {
      sessionId: sessionId,
      timestamp: {
        gte: new Date(Date.now() - 60 * 1000) // Last 60 seconds
      }
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

  // If moved less than 10 meters in 60 seconds → Likely parked
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

## Problem 3: User Leaves Zone Before Parking

### Scenario 3: Gives Up and Leaves

**Timeline:**
- **14:30:00** - Enter SM Mall parking (full)
- **14:42:00** - Give up, exit zone (never parked)
- **Status:** Circling for 12 minutes, no parking

**Naive Calculation:**
```javascript
// Session stays "searching" forever
```

### Solution 3: Zone Exit Detection

**Implementation:**
```javascript
// Mobile app detects zone exit

if (!turf.booleanPointInPolygon(userLocation, parkingComplexZone)) {
  // User left the zone
  POST /api/analytics/zone/exit
  {
    sessionId: 456,
    exitTime: "2025-10-05T14:42:00Z",
    parked: false
  }
}

// Backend handler
async function handleZoneExit(sessionId, exitTime, parked) {
  const session = await prisma.parkingSession.findUnique({
    where: { id: sessionId }
  });

  if (!parked) {
    // User gave up, didn't park
    await prisma.parkingSession.update({
      where: { id: sessionId },
      data: {
        status: 'abandoned',
        circlingEndTime: exitTime,
        circlingDurationSeconds: Math.floor(
          (exitTime - session.circlingStartTime) / 1000
        ),
        // Don't count this in average (or flag it separately)
        excludeFromMetrics: true
      }
    });
  }
}
```

---

## Problem 4: App Backgrounded / Killed

### Scenario 4: User Closes App

**Timeline:**
- **14:30:00** - Enter zone, app active
- **14:35:00** - User closes app to take a call
- **14:35:00-14:40:00** - No activity updates
- **14:40:00** - App reopened, user already parked

### Solution 4A: Background Activity Recognition

**Implementation:**
```javascript
// React Native - Request background location permission

import BackgroundGeolocation from 'react-native-background-geolocation';

BackgroundGeolocation.ready({
  desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
  distanceFilter: 10, // Update every 10 meters
  stopTimeout: 5,     // Stop after 5 minutes of no movement
  enableHeadless: true, // Keep running when app killed

  // Activity Recognition
  activityRecognitionInterval: 10000, // Every 10 seconds
  stopDetectionDelay: 3 // 3 minutes to confirm stop
});

// Even if app is backgrounded, continue sending updates
BackgroundGeolocation.on('activitychange', (activity) => {
  // Send to backend
  fetch('/api/analytics/activity', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: currentSessionId,
      activityType: activity.activity, // still, on_foot, in_vehicle
      confidence: activity.confidence
    })
  });
});
```

### Solution 4B: Session Resume & Backfill

**Implementation:**
```javascript
// When app is reopened, backfill missing time

async function resumeSession(sessionId) {
  const session = await prisma.parkingSession.findUnique({
    where: { id: sessionId }
  });

  if (session.status === 'searching') {
    const lastActivity = await prisma.activityEvent.findFirst({
      where: { sessionId: sessionId },
      orderBy: { timestamp: 'desc' }
    });

    const gapMinutes = (Date.now() - lastActivity.timestamp) / 60000;

    if (gapMinutes > 5) {
      // Assume user parked during the gap
      // Use conservative estimate (midpoint of gap)
      const estimatedParkingTime = new Date(
        lastActivity.timestamp.getTime() + (gapMinutes / 2) * 60000
      );

      await prisma.parkingSession.update({
        where: { id: sessionId },
        data: {
          parkingConfirmationTime: estimatedParkingTime,
          circlingDurationSeconds: Math.floor(
            (estimatedParkingTime - session.circlingStartTime) / 1000
          ),
          status: 'parked',
          dataQuality: 'estimated' // Flag for analytics
        }
      });
    }
  }
}
```

---

## Recommended Solution: Hybrid Approach

**Combine multiple techniques:**

```javascript
// backend/services/parkingDetection.js

class ParkingDetectionService {

  async detectParking(sessionId, currentActivity, currentLocation) {
    // Step 1: Check if activity suggests parking
    const activityScore = await this.checkActivityPattern(sessionId);

    // Step 2: Check location movement
    const movementScore = await this.checkLocationMovement(sessionId, currentLocation);

    // Step 3: Check duration of STILL
    const durationScore = await this.checkStillDuration(sessionId);

    // Step 4: Combined confidence score
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

    return null; // Not confident yet
  }

  async checkActivityPattern(sessionId) {
    const recent = await prisma.activityEvent.findMany({
      where: { sessionId, timestamp: { gte: new Date(Date.now() - 90000) } },
      orderBy: { timestamp: 'desc' },
      take: 5
    });

    const nonVehicleCount = recent.filter(a =>
      a.activityType === 'STILL' || a.activityType === 'ON_FOOT'
    ).length;

    return nonVehicleCount / recent.length; // 0.0 to 1.0
  }

  async checkLocationMovement(sessionId, currentLocation) {
    const oneMinuteAgo = await prisma.activityEvent.findFirst({
      where: {
        sessionId,
        timestamp: { lte: new Date(Date.now() - 60000) }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (!oneMinuteAgo) return 0;

    const distance = turf.distance(
      [oneMinuteAgo.longitude, oneMinuteAgo.latitude],
      [currentLocation.longitude, currentLocation.latitude],
      { units: 'meters' }
    );

    // < 5m = 1.0 (high confidence), > 50m = 0.0 (low confidence)
    return Math.max(0, 1 - (distance / 50));
  }

  async checkStillDuration(sessionId) {
    const firstStill = await prisma.activityEvent.findFirst({
      where: {
        sessionId,
        activityType: { in: ['STILL', 'ON_FOOT'] },
        timestamp: { gte: new Date(Date.now() - 120000) }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (!firstStill) return 0;

    const duration = (Date.now() - firstStill.timestamp) / 1000;

    // < 30s = 0.0, > 60s = 1.0
    return Math.min(1, duration / 60);
  }

  async findEarliestParkingIndicator(sessionId) {
    const activities = await prisma.activityEvent.findMany({
      where: {
        sessionId,
        timestamp: { gte: new Date(Date.now() - 3 * 60000) } // Last 3 min
      },
      orderBy: { timestamp: 'asc' }
    });

    // Find first transition from IN_VEHICLE → STILL/ON_FOOT
    for (let i = 1; i < activities.length; i++) {
      if (
        activities[i-1].activityType === 'IN_VEHICLE' &&
        (activities[i].activityType === 'STILL' || activities[i].activityType === 'ON_FOOT')
      ) {
        return activities[i].timestamp;
      }
    }

    return new Date(); // Fallback to now
  }
}
```

---

## Data Quality Flags

**Add quality indicators to sessions:**

```javascript
// Prisma schema addition
model ParkingSession {
  // ... existing fields

  dataQuality  String?  @map("data_quality")  // 'high', 'medium', 'low', 'estimated'
  // 'high' = continuous activity tracking
  // 'medium' = some gaps, but reliable
  // 'low' = large gaps or low confidence
  // 'estimated' = app was backgrounded, estimated parking time
}

// When aggregating metrics, filter by quality
const highQualitySessions = await prisma.parkingSession.findMany({
  where: {
    zoneId: 5,
    dataQuality: { in: ['high', 'medium'] }, // Exclude low quality data
    excludeFromMetrics: false
  }
});
```

---

## Summary: Edge Case Handling

| Edge Case | Solution | Accuracy Improvement |
|-----------|----------|---------------------|
| **Delayed confirmation** | Retroactive correction with activity buffer | ±30-90 seconds |
| **Traffic jam false positive** | 45s STILL duration + <10m movement | 90%+ accuracy |
| **User gives up** | Zone exit detection | Exclude from metrics |
| **App backgrounded** | Background geolocation + estimated parking time | Flag as 'estimated' |
| **Low battery / offline** | Resume session on reconnect, backfill with estimate | Flag as 'low' quality |

**Expected Accuracy:** 85-95% for high-quality sessions with continuous tracking.

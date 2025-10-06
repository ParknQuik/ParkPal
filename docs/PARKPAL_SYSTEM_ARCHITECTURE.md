# ParkPal System Architecture

> **Smart Parking Management Platform with IoT Analytics and P2P Marketplace**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Service Architecture](#service-architecture)
4. [Technology Stack](#technology-stack)
5. [Data Models](#data-models)
6. [API Design](#api-design)
7. [Monetization Strategy](#monetization-strategy)
8. [Security & Privacy](#security--privacy)

---

## Executive Summary

ParkPal is a **dual-service smart parking platform** that combines:

1. **Service 1: Smart Parking Analytics** - Crowd-sourced parking availability tracking using geofencing, Google Activity Recognition API, and optional IoT sensors to calculate circling time and occupancy rates for commercial parking complexes.

2. **Service 2: P2P Parking Marketplace** - Airbnb-style marketplace where hosts rent out private parking spaces (driveways, garages, roadside spots) to drivers via QR code check-in/checkout.

### Key Value Propositions

**For Drivers:**
- Real-time parking availability
- Predicted circling/search time
- Cheaper parking options (marketplace 20-40% below commercial rates)
- Navigate to less crowded zones

**For Parking Operators:**
- Analytics dashboard showing circling time vs competitors
- Occupancy trends and revenue optimization insights
- Operational improvement recommendations

**For Hosts (Marketplace):**
- Monetize unused parking spaces
- Passive income stream
- Flexible availability control

**For Cities/Governments:**
- City-wide parking analytics
- Congestion reduction insights
- Urban planning data

---

## System Overview

### Core Problem

**Parking Pain Points:**
- Drivers waste 7-12 minutes circling for parking in busy areas
- No visibility into parking availability before arrival
- Commercial parking is expensive
- Unused private parking spaces sit idle
- Operators lack data-driven insights

### ParkPal Solution

```
┌─────────────────────────────────────────────────────────────────┐
│                         PARKPAL PLATFORM                         │
├─────────────────────────┬───────────────────────────────────────┤
│   SERVICE 1: ANALYTICS  │   SERVICE 2: MARKETPLACE              │
├─────────────────────────┼───────────────────────────────────────┤
│ • Geofencing            │ • Host Listings                       │
│ • Activity Recognition  │ • Driver Search/Booking               │
│ • IoT Sensor Integration│ • QR Code Check-in/out                │
│ • Circling Time Calc    │ • Dynamic Pricing                     │
│ • Occupancy Tracking    │ • Reviews & Ratings                   │
│ • Predictive Analytics  │ • Payout Management                   │
├─────────────────────────┼───────────────────────────────────────┤
│ MONETIZATION            │ MONETIZATION                          │
│ • Freemium B2C          │ • 5-7% Commission                     │
│ • B2B Analytics ($)     │ • Premium Listings                    │
│ • B2G City Data ($$)    │ • Advertising                         │
│ • In-app Ads            │                                       │
│ • Pricing API           │                                       │
└─────────────────────────┴───────────────────────────────────────┘
```

---

## Service Architecture

### Service 1: Smart Parking Analytics (Commercial)

**Target:** Large parking complexes (malls, airports, office buildings)

#### Data Collection Flow

```
┌──────────────┐     Enters    ┌──────────────┐
│   Driver     │──────────────>│  Geofenced   │
│  (Mobile App)│    complex    │     Zone     │
└──────────────┘               └──────────────┘
       │                              │
       │ Start Circling Timer         │
       ▼                              ▼
┌──────────────────────────────────────────────┐
│   Google Activity Recognition API             │
│   • IN_VEHICLE → Still searching              │
│   • STILL (30s+) → Parked!                   │
│   • ON_FOOT → Parked!                        │
└──────────────────────────────────────────────┘
       │                              │
       │ Activity Events              │ IoT Sensor
       │ Every 5-10 sec               │ (Optional)
       ▼                              ▼
┌──────────────────────────────────────────────┐
│              Backend Services                 │
│  • Process activity transitions               │
│  • Detect parking confirmation                │
│  • Calculate circling time                    │
│  • Update zone occupancy                      │
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│         Analytics & Predictions               │
│  • Avg circling time per zone/hour            │
│  • Occupancy percentage                       │
│  • Demand forecasting                         │
└──────────────────────────────────────────────┘
```

#### Technical Components

**1. Geofencing**

Technologies:
- Google Geofencing API (Android/iOS)
- Radar.io (unified API)
- Server-side: Turf.js for point-in-polygon checks

Implementation:
```javascript
// Zone geofence stored as GeoJSON
{
  "type": "Polygon",
  "coordinates": [[[lon1, lat1], [lon2, lat2], ...]]
}

// Entry detection
if (userLocation inside geofencePolygon) {
  createParkingSession({
    zoneEntryTime: now(),
    circlingStartTime: now()
  });
}
```

**2. Activity Recognition**

Google Activity Recognition API detects:
- `IN_VEHICLE` - Driving/searching
- `STILL` - Stopped (likely parked)
- `ON_FOOT` - Walking (likely parked)
- `WALKING`, `RUNNING` - Moving

Parking confirmation logic:
```javascript
if (activity === 'STILL' && confidence >= 80% && duration >= 30s) {
  confirmParking(sessionId);
  stopCirclingTimer();
}
```

**3. IoT Sensor Integration (Optional)**

Sensor types:
- Ultrasonic sensors (detect vehicle presence)
- Camera-based (computer vision)
- Magnetic sensors (vehicle detection)

Protocol: MQTT → REST Gateway → Backend

**4. Circling Time Calculation**

```javascript
circlingDuration = parkingConfirmationTime - circlingStartTime
// Example: 14:37:50 - 14:30:00 = 470 seconds (7 min 50 sec)
```

Aggregation:
- Per zone
- Per hour/day/week
- Min/max/average
- Feed into predictions

---

### Service 2: P2P Parking Marketplace

**Target:** Provincial areas, residential parking, events, anywhere without IoT infrastructure

#### User Flows

**Host Flow:**
```
1. Host creates listing
   ├─ Address, photos, amenities
   ├─ Pricing (suggested: 20-40% below commercial)
   └─ Generate QR code

2. Platform generates unique QR code
   └─ QR-HOST-{ownerId}-SLOT-{slotId}

3. Host prints QR code, places at parking spot

4. Spot appears on driver map/search

5. Driver books → Host earns 93-95% of payment
```

**Driver Flow (Pre-booking):**
```
1. Search for parking (location, date, time)
2. Browse available spots with photos/reviews
3. Book and pay (held in escrow)
4. Arrive at spot
5. Scan QR code → Check-in
6. Park
7. Leave and scan QR → Check-out
8. Payment released to host (5-7% commission to platform)
```

**Driver Flow (Walk-up):**
```
1. Find available spot with QR code
2. Scan QR code
3. App shows: "₱30/hour - Tap to start"
4. Confirm → Parking session starts
5. Leave and scan again → Payment charged
```

#### Key Features

**Dynamic Pricing Suggestions:**
```javascript
// Backend recommends pricing based on area
suggestedPrice = commercialAvg * 0.7  // 30% cheaper
if (hostPrice > commercialAvg * 0.9) {
  warn("Price too high, may reduce bookings");
}
```

**Review System:**
- Mutual reviews (driver ↔ host)
- Rating: 1-5 stars
- Impacts listing visibility

**Payout Management:**
- Weekly/monthly payouts
- Track earnings per session
- Platform fee: 5-7%

---

## Technology Stack

### Backend

**Core:**
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL (production), SQLite (dev)
- **ORM:** Prisma

**Services:**
- **API Documentation:** Swagger (OpenAPI 3.0)
- **Real-time:** WebSocket (Socket.io)
- **Caching:** Redis
- **Queue:** Bull (job processing)

**External APIs:**
- **Geofencing:** Google Geofencing API / Radar.io
- **Activity Recognition:** Google Activity Recognition API
- **Maps:** Google Maps API
- **Payments:** Stripe / PayMongo / GCash

**Analytics:**
- **ETL:** Mage / Airflow
- **Transformations:** dbt
- **Query Engine:** Trino (data lake queries)
- **Storage:** AWS S3 (raw data), PostgreSQL (structured)

### Frontend

**Web:**
- React (Next.js)
- Tailwind CSS
- Google Maps React
- Chart.js (analytics)

**Mobile:**
- React Native (Expo)
- React Navigation
- Google Maps SDK
- QR Code Scanner (expo-barcode-scanner)

### Infrastructure

**Development:**
- GitHub (version control)
- GitHub Actions (CI/CD)

**Production:**
- AWS / Heroku / Digital Ocean
- CloudFront (CDN)
- CloudWatch (monitoring)

---

## Data Models

See complete schema in `backend/prisma/schema.prisma`

### Core Entities

**Zone** - Geographic parking area with geofence
```javascript
{
  id, name, type, address, city,
  geofencePolygon,  // GeoJSON
  centerLat, centerLon, radiusMeters,
  totalCapacity, pricePerHour,
  operatingHours
}
```

**ParkingSlot** - Individual parking space
```javascript
{
  id, zoneId, slotNumber,
  lat, lon, floor, section,
  slotType,  // commercial_iot, commercial_manual, roadside_qr
  sensorId, qrCode,  // IoT or QR identifier
  status,  // available, occupied, reserved, out_of_service
  pricePerHour, ownerId
}
```

**ParkingSession** - Active/completed parking event
```javascript
{
  id, userId, zoneId, slotId,
  sessionType,  // commercial_iot, commercial_activity, roadside_qr

  // Circling time tracking (Service 1)
  zoneEntryTime, circlingStartTime,
  parkingConfirmationTime, circlingEndTime,
  circlingDurationSeconds,

  // Activity status
  lastActivityStatus,  // IN_VEHICLE, STILL, ON_FOOT
  activityConfidenceLevel,

  // Payment
  totalAmount, status
}
```

**ActivityEvent** - User activity log (Service 1)
```javascript
{
  id, userId, sessionId,
  activityType,  // IN_VEHICLE, STILL, ON_FOOT
  confidence,  // 0-100
  latitude, longitude,
  timestamp
}
```

**SensorEvent** - IoT sensor data (Service 1)
```javascript
{
  id, sensorId, zoneId, slotId,
  eventType,  // occupied, vacant, malfunction
  eventData,  // JSON metadata
  timestamp
}
```

**ZoneMetrics** - Aggregated analytics (Service 1)
```javascript
{
  id, zoneId, timestamp, periodType,  // hourly, daily

  // Occupancy
  totalSlots, occupiedSlots, availableSlots,
  occupancyPercentage,

  // Circling time
  avgCirclingTimeSeconds, minCirclingTimeSeconds,
  maxCirclingTimeSeconds, totalSessions,

  // Revenue
  totalRevenue
}
```

### Marketplace-Specific Models

**Booking** - Pre-reservation (Service 2)
```javascript
{
  id, userId, slotId,
  bookingStart, bookingEnd,
  status,  // pending, confirmed, cancelled, completed
  sessionId  // Links to actual parking session
}
```

**Payment**
```javascript
{
  id, userId, sessionId,
  amount, currency, paymentMethod,
  status,  // pending, completed, failed, refunded
  transactionId
}
```

**Payout** - Host earnings (Service 2)
```javascript
{
  id, hostId, amount,
  platformFee, netAmount,
  status,  // pending, processing, completed
  sessionIds,  // Array of sessions in this payout
  payoutDate
}
```

**Review** - Ratings (Service 2)
```javascript
{
  id, authorId, targetId,
  rating,  // 1-5
  comment
}
```

---

## API Design

### Service 1: Analytics API

```javascript
// Zone entry (geofence trigger)
POST /api/analytics/zone/enter
{
  userId: 123,
  zoneId: 5,
  latitude: 14.5378,
  longitude: 121.0213
}
Response: { sessionId: 456, circlingStartTime: "2025-10-05T14:30:00Z" }

// Activity update (periodic from mobile app)
POST /api/analytics/activity
{
  userId: 123,
  sessionId: 456,
  activityType: "IN_VEHICLE",
  confidence: 85,
  latitude: 14.5380,
  longitude: 121.0215
}
Response: { status: "ok" }

// Get zone availability (for map)
GET /api/analytics/zones/{zoneId}/availability
Response: {
  zoneId: 5,
  totalSlots: 500,
  occupied: 347,
  available: 153,
  occupancyPercentage: 69.4,
  estimatedCirclingTime: 420  // seconds
}

// IoT sensor webhook
POST /api/analytics/sensor/event
{
  sensorId: "SENSOR-A-123",
  eventType: "occupied",
  timestamp: "2025-10-05T14:37:50Z"
}
Response: { status: "ok" }

// Get analytics (B2B)
GET /api/analytics/zones/{zoneId}/metrics?period=hourly&from=2025-10-01&to=2025-10-07
Response: [{
  timestamp: "2025-10-01T14:00:00Z",
  avgCirclingTime: 420,
  occupancyPercentage: 72.5,
  totalSessions: 145,
  revenue: 12500
}, ...]
```

### Service 2: Marketplace API

```javascript
// Host creates listing
POST /api/marketplace/listings
{
  address: "123 Main St, QC",
  lat: 14.5990,
  lon: 120.9842,
  slotType: "driveway_qr",
  pricePerHour: 30,
  description: "Covered driveway",
  photos: ["base64..."],
  amenities: ["covered", "cctv"]
}
Response: {
  slotId: 999,
  qrCode: "QR-HOST-456-SLOT-1",
  suggestedPrice: 35,  // System recommendation
  commercialAvg: 50
}

// Driver searches
GET /api/marketplace/search?lat=14.5990&lon=120.9842&radius=5km&startTime=2025-10-06T08:00&endTime=2025-10-06T16:00
Response: [{
  slotId: 999,
  address: "123 Main St",
  distance: 1.2,  // km
  pricePerHour: 30,
  totalCost: 240,  // 8 hours
  rating: 4.8,
  photos: ["url"],
  available: true,
  amenities: ["covered", "cctv"]
}]

// Driver books
POST /api/marketplace/bookings
{
  slotId: 999,
  startTime: "2025-10-06T08:00:00",
  endTime: "2025-10-06T16:00:00"
}
Response: {
  bookingId: 12345,
  qrCode: "QR-HOST-456-SLOT-1",
  amount: 240,
  instructions: "Scan QR when you arrive"
}

// QR check-in
POST /api/marketplace/qr/checkin
{
  qrCode: "QR-HOST-456-SLOT-1",
  bookingId: 12345  // Optional if walk-up
}
Response: {
  sessionId: 789,
  message: "Parking started"
}

// QR check-out
POST /api/marketplace/qr/checkout
{
  qrCode: "QR-HOST-456-SLOT-1",
  sessionId: 789
}
Response: {
  sessionId: 789,
  duration: 465,  // minutes
  amount: 240,
  hostEarnings: 225.60,
  platformFee: 14.40,
  message: "Payment completed"
}

// Review
POST /api/marketplace/reviews
{
  slotId: 999,
  rating: 5,
  comment: "Great spot!"
}
Response: { reviewId: 555 }
```

---

## Monetization Strategy

### Revenue Streams

| Stream | Target | Pricing | Potential Monthly Revenue |
|--------|--------|---------|---------------------------|
| **B2C Premium** | Drivers | ₱99/month | ₱990,000 (10k users) |
| **B2B Analytics** | Parking operators | ₱15k-50k/month | ₱600,000 (20 operators) |
| **B2G City Data** | Governments | ₱100k-500k/month | ₱600,000 (3 cities) |
| **In-app Ads** | Advertisers | CPM ₱50 | ₱750,000 |
| **Affiliate** | Payment apps | 3-5% commission | ₱80,000 |
| **Pricing API** | Operators | ₱20k+/month | ₱375,000 (15 operators) |
| **Marketplace** | Drivers/Hosts | 5-7% commission | Variable |

**Total Service 1 Potential:** ₱3.4M+/month

**Service 2 (Marketplace) Example:**
```
10,000 bookings/month × ₱200 avg × 6% = ₱120,000/month
```

### Pricing Strategy

**Service 1 (Free tier):**
- Basic availability map
- Zone occupancy view

**Service 1 (Premium - ₱99/month):**
- Predicted circling time
- Smart routing
- Historical patterns
- Predictive alerts
- Ad-free

**Service 2 (Marketplace):**
- **Commission:** 5-7% per transaction
- **Pricing guidance:** 20-40% below commercial rates
- **Anti-gouging:** Cap price increases to 30% during events

---

## Security & Privacy

### Data Protection

**Personal Data:**
- Encrypt PII (names, emails, phone)
- Hash passwords (bcrypt)
- Tokenize payment data

**Location Data:**
- Only collect when app is active
- Anonymize for analytics
- Allow opt-out

**Compliance:**
- GDPR (if applicable)
- Data Privacy Act (Philippines)
- User consent for location tracking

### Authentication

- JWT tokens
- OAuth 2.0 (Google/Facebook login)
- 2FA for host accounts

### API Security

- Rate limiting
- API key authentication (B2B)
- HTTPS only
- Input validation
- SQL injection prevention

---

## Next Steps

See `DEVELOPMENT_ROADMAP.md` for implementation phases.


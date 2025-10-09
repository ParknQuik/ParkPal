# ParkPal Development Roadmap

> **Phased approach to building both services**

---

## Current State Analysis

### ✅ What's Already Built

**Backend:**
- ✅ Express.js server with CORS
- ✅ Basic auth (register/login with JWT)
- ✅ Parking slot CRUD (list, get, create, update, delete)
- ✅ Basic booking system (create, get user bookings)
- ✅ Payment routes (controllers exist)
- ✅ Alert routes
- ✅ WebSocket for real-time updates
- ✅ Swagger API documentation
- ✅ Prisma ORM setup
- ✅ Database: User, Slot, Booking, Payment models (basic schema)

**Frontend Web:**
- ✅ React app structure
- ✅ Screens: Login, MapView, ListSlot, Payment, Profile, Reservation
- ✅ API integration layer

**Frontend Mobile:**
- ✅ React Native (Expo) setup
- ✅ Comprehensive component library (Button, Card, Input, etc.)
- ✅ Screens: Auth, Home, ParkingDetail, Reservation, MyBookings, ListSpot, Profile, MapView
- ✅ Navigation (AuthStack, BottomTab, MainStack)

### ❌ What's Missing (For New Vision)

**Service 1 (Analytics):**
- ❌ Zone management (CRUD)
- ❌ Geofencing integration
- ❌ Activity Recognition API integration
- ❌ Circling time calculation engine
- ❌ IoT sensor data ingestion (MQTT/REST)
- ❌ Occupancy tracking service
- ❌ Analytics aggregation (hourly/daily metrics)
- ❌ Prediction engine
- ❌ B2B analytics dashboard

**Service 2 (Marketplace):**
- ❌ Marketplace-specific models (Booking, Payout, extended slot fields)
- ❌ QR code generation
- ❌ QR code scanning (mobile)
- ❌ Dynamic pricing recommendations
- ❌ Review system
- ❌ Host payout tracking
- ❌ Search with filters (location, price, amenities)
- ❌ Pre-booking flow
- ❌ Walk-up booking flow

**Shared:**
- ❌ Updated Prisma schema for both services
- ❌ Payment integration (Stripe/PayMongo/GCash)
- ❌ Email notifications
- ❌ Push notifications (mobile)

---

## Development Strategy

### Approach: **Build Service 2 First, Then Service 1**

**Rationale:**
1. **Service 2 (Marketplace) is simpler:**
   - No geofencing complexity
   - No activity recognition
   - No IoT integration
   - Easier to monetize early

2. **Service 1 (Analytics) requires:**
   - Large user base for crowd-sourced data
   - Complex geofencing logic
   - Activity recognition tuning
   - IoT partnership negotiations

3. **Service 2 provides immediate value:**
   - Hosts can list spots day 1
   - Drivers can book/use spots
   - Revenue starts flowing (5-7% commission)

4. **Service 2 builds foundation:**
   - User acquisition
   - Payment infrastructure
   - Mobile app usage patterns
   - Then add analytics layer on top

---

## Phase 1: Foundation & Service 2 MVP (Marketplace)

**Duration:** 4-6 weeks
**Goal:** Launch P2P parking marketplace with core features

### Week 1-2: Database & Backend Core

**Tasks:**
1. Update Prisma schema
   - Add marketplace-specific fields to ParkingSlot (description, amenities, photos, rating, etc.)
   - Add Booking model (pre-reservations)
   - Add Payout model (host earnings)
   - Add Review model
   - Update ParkingSession for marketplace sessions

2. Run database migration

3. Seed database with test data
   - 5 zones (Manila, Quezon City, Makati, etc.)
   - 20 sample parking slots (various types)
   - Test users (hosts + drivers)

4. Update existing slot controller
   - Add photo upload
   - Add amenities handling
   - Add pricing validation

5. Build marketplace-specific endpoints
   - `POST /api/marketplace/listings` - Host creates listing
   - `GET /api/marketplace/search` - Driver searches with filters
   - `POST /api/marketplace/bookings` - Driver books slot
   - `POST /api/marketplace/qr/checkin` - QR check-in
   - `POST /api/marketplace/qr/checkout` - QR check-out
   - `POST /api/marketplace/reviews` - Leave review
   - `GET /api/marketplace/host/earnings` - Host payout dashboard

6. QR code generation
   - Install `qrcode` package
   - Generate unique QR codes for slots
   - Return QR code image (base64) in listing response

### Week 3-4: Mobile App (Primary Interface)

**Tasks:**
1. Update mobile screens for marketplace
   - **HomeScreen:** Show nearby listings (map + list view)
   - **ParkingDetailScreen:** Show photos, amenities, reviews, QR code
   - **ListSpotScreen:** Host creates listing with camera upload
   - **ReservationScreen:** Booking flow with date/time picker
   - **MyBookingsScreen:** Show upcoming/past bookings

2. Implement QR code scanner
   - Install `expo-barcode-scanner`
   - Create QRScannerScreen
   - Handle check-in/check-out flow

3. Search & filters
   - Location-based search (use Google Maps API)
   - Filter by price range
   - Filter by amenities
   - Sort by distance/price/rating

4. Booking flow
   - Pre-booking: Select date/time → Pay → Receive QR code
   - Walk-up: Scan QR → Confirm → Start parking

5. Host dashboard
   - List host's spots
   - View earnings
   - Manage availability

6. Reviews
   - Leave review after check-out
   - View reviews on listing

### Week 5: Payment Integration

**Tasks:**
1. Choose payment provider
   - **Recommended:** PayMongo (Philippines-focused)
   - Alternative: Stripe, GCash API

2. Integrate payment flow
   - Create payment intent on booking
   - Hold funds in escrow
   - Release to host after check-out (minus 5-7% fee)

3. Payout system
   - Weekly/monthly payout schedule
   - Track host earnings
   - Generate payout reports

4. Refund handling
   - Cancellation policy (24hr notice = full refund)
   - Dispute resolution flow

### Week 6: Web Dashboard & Polish

**Tasks:**
1. Update web app for marketplace
   - Host listing management
   - Analytics dashboard (earnings, bookings)
   - Review management

2. Admin panel
   - View all listings
   - Approve/reject listings
   - Handle disputes

3. Testing & bug fixes
   - End-to-end testing (booking → payment → check-in → check-out)
   - Edge cases (QR code errors, payment failures)

4. Documentation
   - User guides (how to list, how to book)
   - API documentation updates

**Deliverables:**
- ✅ Working marketplace with QR-based parking
- ✅ Mobile app for drivers & hosts
- ✅ Payment processing
- ✅ Review system
- ✅ Basic web dashboard

---

## Phase 2: Service 1 Foundation (Smart Analytics)

**Duration:** 6-8 weeks
**Goal:** Launch crowd-sourced parking analytics with geofencing & activity recognition

### Week 7-8: Zone Management & Geofencing

**Tasks:**
1. Build zone management API
   - `POST /api/zones` - Create zone with geofence
   - `GET /api/zones` - List zones
   - `PUT /api/zones/{id}` - Update geofence
   - `GET /api/zones/nearby` - Find zones near user

2. Implement geofence logic (server-side)
   - Install `@turf/turf` for geospatial calculations
   - Point-in-polygon detection
   - Zone entry/exit detection

3. Geofence UI (web admin)
   - Draw geofence on map (Google Maps Drawing Tools)
   - Save as GeoJSON polygon
   - Preview geofence boundaries

4. Link existing slots to zones
   - Update slot creation to require zoneId
   - Migrate existing slots to default zone

### Week 9-10: Activity Recognition & Circling Time

**Tasks:**
1. Integrate Google Activity Recognition API (mobile)
   - Request location permissions
   - Start activity recognition when entering zone
   - Send activity updates to backend every 5-10 seconds

2. Build parking session service
   - `POST /api/analytics/zone/enter` - Start session on geofence entry
   - `POST /api/analytics/activity` - Log activity events
   - `POST /api/analytics/parking/confirm` - Confirm parking (auto or manual)

3. Circling time calculation
   - Background service monitors active sessions
   - Detects STILL activity (30s+ threshold)
   - Calculates circling duration
   - Updates session with circling time

4. Activity event storage
   - Store all activity events for analysis
   - Prune old events (>30 days)

### Week 11-12: Occupancy Tracking & Basic Analytics

**Tasks:**
1. Real-time occupancy tracking
   - Count active sessions per zone
   - Calculate occupancy percentage
   - Expose via API: `GET /api/analytics/zones/{id}/availability`

2. Aggregation service (cron job)
   - Hourly aggregation of zone metrics
   - Calculate avg/min/max circling time
   - Store in ZoneMetrics table

3. Mobile app updates
   - Show zone occupancy on map (color-coded)
   - Display estimated circling time
   - "Smart routing" - suggest less crowded zones

4. Basic analytics dashboard (web)
   - Zone occupancy chart (Chart.js)
   - Circling time trends
   - Peak hours heatmap

**Deliverables:**
- ✅ Geofencing for commercial parking zones
- ✅ Activity recognition tracking
- ✅ Circling time calculation
- ✅ Real-time occupancy display
- ✅ Basic analytics dashboard

---

## Phase 3: IoT Integration & Advanced Analytics

**Duration:** 4-6 weeks
**Goal:** Integrate optional IoT sensors and build predictive analytics

### Week 13-14: IoT Sensor Integration

**Tasks:**
1. MQTT broker setup (optional: AWS IoT Core / Mosquitto)

2. Sensor webhook endpoint
   - `POST /api/analytics/sensor/event`
   - Process occupied/vacant events
   - Update slot status
   - Link to parking sessions

3. Sensor dashboard
   - Register sensors
   - View sensor status (online/offline)
   - Debugging tools

### Week 15-16: Prediction Engine (Basic ML)

**Tasks:**
1. Historical data collection
   - Export zone metrics to CSV
   - Label data (hour of day, day of week, occupancy %)

2. Simple prediction model
   - Time-series forecasting (ARIMA or Prophet)
   - Predict occupancy for next hour/day
   - Predict circling time

3. Prediction API
   - `GET /api/analytics/zones/{id}/predictions`
   - Return predicted occupancy + circling time

4. Mobile app integration
   - Show predictions: "Expected 85% full at 2pm"
   - Proactive alerts: "Your usual parking will be full soon"

### Week 17-18: B2B Analytics Dashboard

**Tasks:**
1. Operator dashboard (premium feature)
   - Zone comparison (vs competitors)
   - Revenue optimization insights
   - Operational recommendations

2. Pricing API
   - `GET /api/pricing/recommend` - Dynamic pricing suggestions
   - Based on occupancy, demand, competitor pricing

3. B2G city analytics
   - City-wide view
   - Congestion hotspots
   - Export reports (PDF/CSV)

4. Billing & subscription system
   - Stripe subscriptions for B2B/B2G
   - Usage-based billing

**Deliverables:**
- ✅ IoT sensor support
- ✅ Predictive analytics
- ✅ B2B operator dashboard
- ✅ Dynamic pricing API
- ✅ City-wide analytics (B2G)

---

## Phase 4: Premium Features & Scale

**Duration:** 4-6 weeks
**Goal:** Launch freemium model, premium subscriptions, and scale infrastructure

### Week 19-20: Freemium & Premium Tiers

**Tasks:**
1. Implement subscription system
   - Free tier: Basic availability map
   - Premium (₱99/month): Predictions, smart routing, ad-free

2. Paywall logic
   - Feature flagging (premium-only endpoints)
   - Subscription check middleware

3. In-app purchases (mobile)
   - RevenueCat integration
   - Subscription UI

4. Advertising (free tier)
   - Google AdMob integration
   - Banner ads on map view

### Week 21-22: Notifications & Engagement

**Tasks:**
1. Push notifications (mobile)
   - Firebase Cloud Messaging
   - Booking reminders
   - "Parking available" alerts
   - Promotional notifications

2. Email notifications
   - Booking confirmations
   - Payment receipts
   - Host payout notifications

3. Gamification
   - Points for check-ins
   - Leaderboards
   - Rewards program

### Week 23-24: Infrastructure & Performance

**Tasks:**
1. Database optimization
   - Indexing for geospatial queries
   - Query optimization
   - Connection pooling

2. Caching layer
   - Redis for zone availability
   - Cache predictions
   - Rate limiting

3. Load testing
   - Simulate 10k concurrent users
   - Identify bottlenecks
   - Optimize slow endpoints

4. Monitoring & logging
   - Sentry (error tracking)
   - CloudWatch (metrics)
   - Alerting (Slack/PagerDuty)

**Deliverables:**
- ✅ Freemium + premium subscriptions
- ✅ Push & email notifications
- ✅ Scalable infrastructure
- ✅ Monitoring & alerting

---

## Phase 5: Growth & Expansion

**Duration:** Ongoing
**Goal:** Acquire users, expand coverage, optimize revenue

### Priorities

1. **User Acquisition**
   - Partner with 2-3 major malls for pilot (Service 1)
   - Incentivize hosts to list spots (Service 2)
   - Referral program
   - Social media marketing

2. **Geographic Expansion**
   - Launch in Metro Manila
   - Expand to Cebu, Davao
   - Provincial coverage (Service 2 focus)

3. **B2B Sales**
   - Pitch analytics to mall operators
   - City government partnerships
   - IoT sensor sales

4. **Advanced Features**
   - EV charging spot finder
   - Handicap parking search
   - Valet parking integration
   - Corporate parking management

---

## Development Priorities Summary

### Immediate (Weeks 1-6): **Service 2 MVP**
Focus: Get marketplace live, start generating revenue

### Short-term (Weeks 7-12): **Service 1 Foundation**
Focus: Build analytics with geofencing + activity recognition

### Medium-term (Weeks 13-18): **IoT & B2B**
Focus: Enterprise features, predictions, operator dashboards

### Long-term (Weeks 19+): **Scale & Monetize**
Focus: Subscriptions, ads, growth, infrastructure

---

## Success Metrics

### Service 2 (Marketplace)
- **Month 1:** 50 host listings, 200 bookings
- **Month 3:** 200 listings, 1000 bookings, ₱120k revenue
- **Month 6:** 500 listings, 5000 bookings, ₱600k revenue

### Service 1 (Analytics)
- **Month 1:** 1000 active users, 3 zones covered
- **Month 3:** 5000 users, 10 zones, 1 B2B customer
- **Month 6:** 20k users, 30 zones, 5 B2B customers, ₱500k monthly revenue

### Combined
- **Year 1 Revenue Target:** ₱2-3M/month
- **Year 2 Revenue Target:** ₱10M+/month

---

## Risk Mitigation

### Technical Risks
- **Geofencing accuracy:** Test extensively, provide manual zone entry
- **Activity recognition false positives:** Tunable threshold, manual confirmation option
- **IoT sensor costs:** Start with software-only, add sensors later

### Business Risks
- **Low user adoption:** Aggressive marketing, referral bonuses
- **Host onboarding slow:** Incentive program (first month free commission)
- **Operator pushback:** Offer free trial, demonstrate ROI

### Regulatory Risks
- **Zoning laws:** Ensure compliance, host verification
- **Liability:** Insurance partnerships, clear ToS

---

## Next Steps

**Start with Phase 1, Week 1:**
1. Update Prisma schema
2. Run migration
3. Build marketplace listing API
4. Test with Postman/Swagger

Let's build! 🚀


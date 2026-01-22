# ParkPal Tech Stack Summary

**Last Updated:** January 4, 2026
**Status:** Authoritative reference for all technology decisions

---

## Architecture Layers

### 1. Presentation Layer

#### Web Application
- **Framework:** React 18.2 with Next.js
- **Styling:** Tailwind CSS + Material-UI v5
- **Maps:** Google Maps React
- **Charts:** Chart.js (analytics dashboards)
- **Build:** Vite
- **State:** React Hooks + Context
- **HTTP Client:** Axios
- **Routing:** React Router v6

#### Mobile Application
- **Framework:** React Native 0.81.5
- **Platform:** Expo SDK 54
- **Language:** TypeScript
- **Navigation:** React Navigation v6
- **State Management:** Redux Toolkit 2.11.1
- **Maps:** react-native-maps (Google Maps SDK)
- **QR Scanner:** expo-barcode-scanner
- **Animations:** react-native-reanimated
- **Accessibility:** WCAG AA compliant
- **Features:** Haptic feedback, performance utilities

---

### 2. API Layer (Backend)

#### Core
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** JavaScript (TypeScript partial on web)
- **ORM:** Prisma
- **API Docs:** Swagger (OpenAPI 3.0)

#### Real-time & Job Processing
- **WebSocket:** Socket.io
- **Job Queue:** Bull (async task processing)

#### Security & Validation
- **Auth:** JWT + bcrypt
- **Password Policy:** OWASP-compliant with HIBP breach checking
- **Security Headers:** Helmet.js
- **Rate Limiting:** express-rate-limit
- **Input Validation:** Joi (100% coverage - 23 routes, 21 schemas)
- **CORS:** Configured and active

#### Monitoring & Logging
- **Logging:** Winston (structured logging)
- **Metrics:** Prometheus
- **Health Checks:** Custom middleware
- **Error Tracking:** (Sentry recommended for production)

---

### 3. Data Layer

#### Primary Database
- **Production:** PostgreSQL
- **Development:** SQLite (legacy)
- **ORM:** Prisma
- **Performance:** 24 indexes implemented
- **Connection Pooling:** Configured via Prisma

#### Caching
- **Cache:** Redis
- **Impact:** 50% DB load reduction
- **Use Cases:** Hot listings, user sessions, API responses

#### Models (11 total)
- User
- ParkingSlot
- Zone
- ParkingSession
- Booking
- Payment
- Payout
- Review
- ActivityEvent (Service 1)
- SensorEvent (Service 1)
- ZoneMetrics (Service 1)

---

### 4. Analytics Layer (Service 1 - Planned)

**Platform:** Databricks (hosted on GCP)

#### Data Processing
- **Storage:** GCP Cloud Storage (raw data lake)
- **Architecture:** Delta Lake (Bronze/Silver/Gold layers)
- **Processing Engine:** Apache Spark (via Databricks)
- **Transformations:** Delta Live Tables
- **Orchestration:** Databricks Workflows

#### Machine Learning
- **ML Platform:** MLflow (model tracking & deployment)
- **Use Cases:**
  - Circling time predictions
  - Occupancy forecasting
  - Demand prediction
  - Dynamic pricing optimization

#### Geospatial Processing
- **Library:** Turf.js (@turf/turf)
- **Use Cases:**
  - Geofencing (point-in-polygon checks)
  - Distance calculations
  - Zone boundary validation

---

### 5. External Integrations

#### Location & Activity
- **Geofencing:** Google Geofencing API / Radar.io
- **Activity Recognition:** Google Activity Recognition API
- **Maps:** Google Maps API

#### Payments
- **Primary:** PayMongo (4 payment methods implemented)
  - GCash
  - Credit/Debit Cards
  - GrabPay
  - Maya (PayMaya)
- **Alternatives:** Stripe, GCash direct

#### IoT (Service 1 - Future)
- **Protocol:** MQTT → REST Gateway → Backend
- **Sensor Types:**
  - Ultrasonic sensors (vehicle presence detection)
  - Camera-based (computer vision)
  - Magnetic sensors (vehicle detection)

#### Security
- **Secrets Management:** GCP Secret Manager
- **API Keys:** All stored in GCP Secret Manager (not .env)

---

### 6. Infrastructure

#### Cloud Platform
- **Primary Cloud:** Google Cloud Platform (GCP)
- **Analytics Platform:** Databricks on GCP
- **Storage:** GCP Cloud Storage

#### Development
- **Version Control:** GitHub
- **CI/CD:** GitHub Actions
- **Testing:** Jest (280+ tests total)
  - Backend: 150 tests (99.3% pass rate)
  - Mobile: 45 tests
  - Web: 85 tests (72% pass rate)
- **Performance Testing:** Artillery, k6, Lighthouse

#### Production (Planned)
- **Hosting:** GCP / AWS / Heroku / Digital Ocean
- **CDN:** CloudFront (or GCP CDN)
- **Monitoring:** CloudWatch / GCP Monitoring
- **Container:** Docker (multi-stage builds)
- **Deployment:** Docker + CI/CD pipeline ready

#### Infrastructure Costs (Phase 5)
- **Staging:** $60/month
- **Production:** $515/month
- **External Services:** $1/month
- **Total:** $576/month

---

## Key Technology Decisions

### Why Databricks on GCP?
- **Unified Platform:** Single platform for data engineering, ML, and analytics
- **Delta Lake:** ACID transactions, time travel, schema enforcement
- **Scalability:** Auto-scaling Spark clusters
- **GCP Integration:** Native integration with GCP Cloud Storage
- **MLflow:** Built-in ML model tracking and deployment
- **Cost Efficiency:** Pay-per-use compute, no separate ETL tools needed

### Why GCP Cloud Storage?
- **Simplicity:** Simple blob storage for raw data lake
- **Cost:** Cheaper than managing separate storage infrastructure
- **Integration:** Native Databricks integration
- **Scalability:** Unlimited storage, auto-scaling

### Why PostgreSQL + Redis?
- **PostgreSQL:** Production-grade relational database with PostGIS for geospatial
- **Redis:** Fast in-memory cache for hot data (50% DB load reduction)
- **Performance:** 24 indexes + caching = 10x speed improvement (200-500ms → 10-50ms)

### Why React Native + Expo?
- **Cross-platform:** Single codebase for iOS + Android
- **Developer Experience:** Fast development, hot reload
- **Community:** Large ecosystem of libraries
- **OTA Updates:** Expo allows over-the-air updates without app store approval

---

## Development Status (January 2026)

### Completed Infrastructure ✅
- Backend: Node.js + Express + PostgreSQL + Redis (100%)
- Mobile: React Native + Expo + Redux (95%)
- Web: React + Next.js + Material-UI (85%)
- Security: 100/100 score (rate limiting, CORS, Joi, Helmet, JWT)
- Performance: 10x improvement (Redis caching, 24 indexes)
- Testing: 280+ tests (91% pass rate with testing infrastructure merge)
- CI/CD: GitHub Actions configured
- Docker: Multi-stage builds ready

### Pending Implementation ⚠️
- Databricks integration (Phase 6 - starts March 2026)
- GCP Cloud Storage setup (Phase 6)
- Activity Recognition API (Phase 6)
- Geofencing (Turf.js) (Phase 6)
- MLflow models (Phase 7)
- IoT sensor integration (Phase 7)

---

## Tech Stack Principles

1. **GCP-First:** Prefer GCP services for consistency (Cloud Storage, Secret Manager, etc.)
2. **Databricks for Analytics:** All data engineering, ML, and analytics on Databricks
3. **Simple Storage:** GCP Cloud Storage for raw data lake (not AWS S3)
4. **No Separate ETL Tools:** Databricks handles all ETL/ELT (no Mage, Airflow, dbt, or Trino)
5. **TypeScript Gradual:** TypeScript on mobile, gradual adoption on web, JavaScript on backend
6. **Security First:** 100/100 security score maintained
7. **Testing Required:** 80%+ test coverage before production launch

---

## References

- **System Architecture:** `docs/PARKPAL_SYSTEM_ARCHITECTURE.md`
- **Service 1 Roadmap:** `SERVICE_1_ANALYTICS_ROADMAP.md`
- **Backend Architecture:** `BACKEND_ARCHITECTURE_REVIEW.md`
- **Current Status:** `JANUARY_2026_STATUS_REPORT.md`
- **Phase 5 Roadmap:** `PHASE_5_PUBLIC_LAUNCH_ROADMAP.md`

---

**This document is the authoritative reference for all technology decisions. Any conflicting information in other documents should defer to this specification.**

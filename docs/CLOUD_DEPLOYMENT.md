# ParknQuik Cloud Deployment Guide

> **Production-Ready Infrastructure for Dual-Service Platform**

---

## Table of Contents

1. [Deployment Strategy Overview](#deployment-strategy-overview)
2. [Recommended Architecture](#recommended-architecture)
3. [Phase 1: MVP Deployment (Service 2)](#phase-1-mvp-deployment-service-2)
4. [Phase 2: Analytics Infrastructure (Service 1)](#phase-2-analytics-infrastructure-service-1)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Cost Analysis](#cost-analysis)
7. [Monitoring & Scaling](#monitoring--scaling)

---

## Deployment Strategy Overview

### Multi-Phase Approach

**Phase 1 (Weeks 1-6):** Service 2 MVP - Simple Infrastructure
- Backend API
- Web dashboard
- Mobile app (Expo)
- Database
- Payment integration

**Phase 2 (Months 2-3):** Service 1 Analytics - Data Infrastructure
- Add geofencing service
- Activity tracking pipeline
- Analytics database (time-series)
- Real-time processing

**Phase 3 (Months 4-6):** Scale & Optimize
- Auto-scaling
- Global CDN
- Data lake
- Advanced monitoring

---

## Recommended Architecture

### Option A: AWS (Recommended for Scale)

**Best for:** Long-term, scalable production with analytics needs

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │ Route 53     │────────>│  CloudFront  │ (CDN)               │
│  │ (DNS)        │         │  (Static Web)│                     │
│  └──────────────┘         └──────────────┘                     │
│                                   │                              │
│                                   ▼                              │
│              ┌─────────────────────────────────┐                │
│              │    S3 Bucket (Web Frontend)     │                │
│              └─────────────────────────────────┘                │
│                                                                  │
│  ┌────────────────────────────────────────────────────┐        │
│  │           Application Load Balancer (ALB)          │        │
│  └────────────────────────────────────────────────────┘        │
│                     │                    │                      │
│                     ▼                    ▼                      │
│       ┌──────────────────┐    ┌──────────────────┐            │
│       │   ECS Fargate    │    │   ECS Fargate    │            │
│       │  (Backend API)   │    │  (WebSocket)     │            │
│       │  Auto-scaling    │    │  Auto-scaling    │            │
│       └──────────────────┘    └──────────────────┘            │
│                     │                                            │
│                     ▼                                            │
│       ┌──────────────────────────────┐                         │
│       │      RDS PostgreSQL          │                         │
│       │  (Multi-AZ for HA)           │                         │
│       │  Automated backups           │                         │
│       └──────────────────────────────┘                         │
│                                                                  │
│       ┌──────────────────────────────┐                         │
│       │    ElastiCache (Redis)       │                         │
│       │  (Caching + Sessions)        │                         │
│       └──────────────────────────────┘                         │
│                                                                  │
│       ┌──────────────────────────────┐                         │
│       │         S3 Buckets           │                         │
│       │  • Images (parking photos)   │                         │
│       │  • QR codes                  │                         │
│       │  • Analytics data (raw)      │                         │
│       └──────────────────────────────┘                         │
│                                                                  │
│  ─────────── Service 1 Analytics (Phase 2) ───────────         │
│                                                                  │
│       ┌──────────────────────────────┐                         │
│       │   Kinesis Data Stream        │                         │
│       │  (Activity events ingestion) │                         │
│       └──────────────────────────────┘                         │
│                     │                                            │
│                     ▼                                            │
│       ┌──────────────────────────────┐                         │
│       │      Lambda Functions        │                         │
│       │  • Geofence detection        │                         │
│       │  • Circling time calc        │                         │
│       └──────────────────────────────┘                         │
│                     │                                            │
│                     ▼                                            │
│       ┌──────────────────────────────┐                         │
│       │   Timestream (Time-series)   │                         │
│       │  (Activity events, metrics)  │                         │
│       └──────────────────────────────┘                         │
│                                                                  │
│       ┌──────────────────────────────┐                         │
│       │       QuickSight             │                         │
│       │  (B2B Analytics Dashboard)   │                         │
│       └──────────────────────────────┘                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

External Services:
• Google Maps API
• Google Activity Recognition API (mobile)
• PayMongo / Stripe (payments)
• SendGrid (emails)
• Firebase Cloud Messaging (push notifications)
• Expo Application Services (mobile OTA updates)
```

**Cost Estimate (Phase 1 - MVP):** ~$150-250/month
**Cost Estimate (Phase 2 - With Analytics):** ~$400-600/month

---

### Option B: Heroku + Supabase (Simplest for MVP)

**Best for:** Quick launch, minimal DevOps, capstone projects

```
┌─────────────────────────────────────────────────────────────────┐
│                    HEROKU + SUPABASE STACK                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend Web: Vercel (Free tier)                               │
│  ├─ Next.js/React deployment                                    │
│  └─ Automatic CDN + SSL                                         │
│                                                                  │
│  Backend API: Heroku Dyno                                       │
│  ├─ Professional Dyno: $25/month                                │
│  ├─ Auto SSL, scaling, logging                                  │
│  └─ WebSocket support                                           │
│                                                                  │
│  Database: Supabase (Postgres)                                  │
│  ├─ Free tier: 500MB (good for MVP)                             │
│  ├─ Pro: $25/month (8GB, backups)                               │
│  └─ Realtime subscriptions included                             │
│                                                                  │
│  Redis: Heroku Redis Mini ($15/month)                           │
│  │                                                               │
│  File Storage: Supabase Storage (Free tier: 1GB)                │
│  │                                                               │
│  Mobile: Expo EAS                                                │
│  ├─ Build: $29/month                                            │
│  └─ OTA updates included                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Total: ~$95-150/month (MVP)
```

**Pros:**
- ✅ Simplest setup (minimal config)
- ✅ Built-in SSL, monitoring
- ✅ Great for MVP/demo
- ✅ Free tiers available

**Cons:**
- ❌ Less control
- ❌ Harder to scale Service 1 analytics
- ❌ Higher cost at scale

---

### Option C: Google Cloud Platform (Best for Geolocation)

**Best for:** Google Maps/Activity Recognition API integration

```
┌─────────────────────────────────────────────────────────────────┐
│                      GCP ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Cloud Load Balancer → Cloud Run (Backend API)                  │
│                      → Cloud Run (WebSocket)                     │
│                                                                  │
│  Cloud SQL (PostgreSQL)                                          │
│  Cloud Memorystore (Redis)                                       │
│  Cloud Storage (Images, QR codes)                                │
│  Firebase (Push notifications, auth)                             │
│                                                                  │
│  ─────── Service 1 Analytics ───────                            │
│  Pub/Sub → Dataflow → BigQuery                                  │
│  Cloud Functions (geofence detection)                            │
│  Looker Studio (B2B dashboards)                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Cost: ~$200-400/month (MVP + Analytics)
```

**Pros:**
- ✅ Excellent Google Maps API integration
- ✅ Built-in geofencing (Firebase + Cloud Functions)
- ✅ BigQuery perfect for analytics
- ✅ Free $300 credit for new accounts

**Cons:**
- ❌ Steeper learning curve
- ❌ Can get expensive at scale

---

## Phase 1: MVP Deployment (Service 2)

**Recommended: Heroku + Supabase for speed**

### 1. Backend Deployment (Heroku)

**Step 1: Prepare Backend**

```bash
cd backend

# Add Procfile
echo "web: node index.js" > Procfile

# Ensure PORT is from env
# Already done in index.js: process.env.PORT || 3001

# Add engines to package.json
npm pkg set engines.node="18.x"
```

**Step 2: Create Heroku App**

```bash
# Install Heroku CLI
brew install heroku/brew/heroku  # macOS
# or download from https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create parkpal-api

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:essential-0  # $5/month
# or use Supabase (see below)

# Add Redis
heroku addons:create heroku-redis:mini  # $15/month

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -hex 32)
heroku config:set ALLOWED_ORIGINS=https://parkpal.vercel.app,https://parkpal-mobile-app.com

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy
heroku run npx prisma db seed  # if you have seed data

# View logs
heroku logs --tail
```

**Step 3: Alternative - Use Supabase for Database**

```bash
# Go to supabase.com → New Project
# Copy connection string

# Set DATABASE_URL
heroku config:set DATABASE_URL="postgresql://user:pass@db.supabase.co:5432/postgres"

# Update Prisma schema datasource
# provider = "postgresql"
# url = env("DATABASE_URL")
```

---

### 2. Frontend Web Deployment (Vercel)

**Step 1: Prepare Web App**

```bash
cd frontend/web

# Create vercel.json
cat > vercel.json <<EOF
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_API_BASE_URL": "https://parkpal-api.herokuapp.com"
  }
}
EOF
```

**Step 2: Deploy to Vercel**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Or connect GitHub repo for auto-deploy
# 1. Go to vercel.com
# 2. Import Git Repository
# 3. Select frontend/web directory
# 4. Auto-deploys on git push
```

**Alternative: Netlify**

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist

# Set env vars in Netlify dashboard
```

---

### 3. Mobile App Deployment (Expo)

**Step 1: Configure EAS (Expo Application Services)**

```bash
cd frontend/mobile

# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# This creates eas.json
```

**Step 2: Update API URL for Production**

```javascript
// app.config.js or app.json
export default {
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://parkpal-api.herokuapp.com"
  }
}

// In code
import Constants from 'expo-constants';
const API_URL = Constants.expoConfig.extra.apiUrl;
```

**Step 3: Build & Submit**

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to app stores
eas submit --platform ios
eas submit --platform android

# Or use OTA updates (instant updates without app store)
eas update --branch production --message "Fixed bug"
```

**Pricing:**
- Free: Limited builds
- Production: $29/month (unlimited builds + OTA updates)

---

### 4. File Storage (Images, QR Codes)

**Option A: Supabase Storage (Recommended for MVP)**

```javascript
// backend/config/storage.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function uploadImage(file, path) {
  const { data, error } = await supabase.storage
    .from('parking-images')
    .upload(path, file);

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('parking-images')
    .getPublicUrl(path);

  return publicUrl;
}
```

**Option B: AWS S3**

```bash
# Install AWS SDK
npm install aws-sdk

# Set env vars on Heroku
heroku config:set AWS_ACCESS_KEY_ID=your_key
heroku config:set AWS_SECRET_ACCESS_KEY=your_secret
heroku config:set AWS_REGION=ap-southeast-1  # Singapore (closest to Philippines)
heroku config:set S3_BUCKET_NAME=parkpal-images
```

---

### 5. Environment Variables Setup

**Backend (Heroku):**

```bash
# Production
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=<postgres_url>
heroku config:set REDIS_URL=<redis_url>  # Auto-set by addon
heroku config:set JWT_SECRET=<generate_secure_random>
heroku config:set ALLOWED_ORIGINS=https://parkpal.vercel.app
heroku config:set GOOGLE_MAPS_API_KEY=<your_key>
heroku config:set PAYMONGO_SECRET_KEY=<your_key>
heroku config:set SENDGRID_API_KEY=<your_key>

# QA environment (create separate app)
heroku create parkpal-api-qa
heroku config:set NODE_ENV=qa --app parkpal-api-qa
# ... repeat for QA
```

**Frontend Web (Vercel):**

```
VITE_API_BASE_URL=https://parkpal-api.herokuapp.com
VITE_GOOGLE_MAPS_API_KEY=<your_key>
```

**Frontend Mobile (EAS):**

```json
// eas.json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://parkpal-api.herokuapp.com"
      }
    }
  }
}
```

---

## Phase 2: Analytics Infrastructure (Service 1)

**Add-ons for Service 1:**

### 1. Real-time Event Streaming

**Option A: AWS Kinesis (if using AWS)**

```bash
# Create Kinesis stream
aws kinesis create-stream \
  --stream-name parkpal-activity-events \
  --shard-count 1

# Lambda function to process events
# Detects geofence entry/exit, calculates circling time
```

**Option B: Heroku Kafka (if staying on Heroku)**

```bash
heroku addons:create heroku-kafka:basic-0  # $100/month

# Backend sends events to Kafka topic
# Consumer processes events
```

### 2. Time-Series Database

**Option A: TimescaleDB (Postgres extension)**

```sql
-- Add to existing Postgres
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert activity_events to hypertable
SELECT create_hypertable('activity_events', 'timestamp');

-- Compression for old data
ALTER TABLE activity_events SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'user_id'
);
```

**Option B: AWS Timestream**

Managed time-series database, good for analytics queries.

### 3. Analytics Dashboard (B2B)

**Option A: Metabase (Self-hosted)**

```bash
# Deploy on Heroku
heroku create parkpal-analytics
heroku addons:create heroku-postgresql:essential-0

# Deploy Metabase
git clone https://github.com/metabase/metabase
cd metabase
git push heroku main

# Connect to your main database (read-only user)
```

**Option B: AWS QuickSight / Google Looker Studio**

Cloud-based BI tools, pay per user.

---

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.14
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: "parkpal-api"
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
          appdir: "backend"

      - name: Run migrations
        run: |
          heroku run npx prisma migrate deploy --app parkpal-api

  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend/web

  deploy-mobile:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.message, '[mobile]')
    steps:
      - uses: actions/checkout@v3

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: OTA Update
        run: |
          cd frontend/mobile
          eas update --branch production --message "${{ github.event.head_commit.message }}"
```

---

## Cost Analysis

### Phase 1: Service 2 MVP (Heroku + Supabase)

| Service | Tier | Cost/Month |
|---------|------|------------|
| Heroku Dyno (API) | Professional | $25 |
| Heroku Postgres | Essential-0 | $5 |
| Heroku Redis | Mini | $15 |
| Vercel (Web) | Free | $0 |
| Supabase Storage | Free (1GB) | $0 |
| Expo EAS | Production | $29 |
| **Total** | | **~$75/month** |

### Phase 1: Service 2 MVP (AWS)

| Service | Tier | Cost/Month |
|---------|------|------------|
| ECS Fargate (2 tasks) | 0.5 vCPU, 1GB | $30 |
| RDS PostgreSQL | db.t3.micro | $15 |
| ElastiCache Redis | cache.t3.micro | $12 |
| S3 + CloudFront | 50GB | $5 |
| ALB | 1 load balancer | $18 |
| Route 53 | 1 hosted zone | $0.50 |
| **Total** | | **~$80/month** |

### Phase 2: With Analytics (AWS)

| Additional Services | Cost/Month |
|---------------------|------------|
| Kinesis Data Stream | $15 |
| Lambda (processing) | $10 |
| Timestream | $50-100 |
| QuickSight (10 users) | $90 |
| **Additional Cost** | **~$165-215** |
| **Total** | **~$245-295/month** |

### At Scale (10k MAU, 100k sessions/month)

| Service | Scaled Tier | Cost/Month |
|---------|-------------|------------|
| ECS Fargate (auto-scale 2-10) | Avg 5 tasks | $150 |
| RDS (larger instance) | db.t3.medium | $60 |
| ElastiCache | cache.t3.small | $25 |
| S3 + CloudFront | 500GB + 1TB transfer | $50 |
| ALB | 1 load balancer | $18 |
| Kinesis | 3 shards | $45 |
| Timestream | Higher writes | $200 |
| **Total** | | **~$550/month** |

**Revenue at scale:** ₱2-3M/month
**Infrastructure cost:** ~$550/month (₱30k)
**Profit margin:** 98%+ 🚀

---

## Monitoring & Scaling

### 1. Application Monitoring

**Free/Cheap Options:**
- **Sentry** (error tracking) - Free tier: 5k errors/month
- **LogRocket** (session replay) - Free tier: 1k sessions/month
- **Uptime Robot** (uptime monitoring) - Free: 50 monitors

**Setup:**

```javascript
// backend/index.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### 2. Database Monitoring

```sql
-- Enable pg_stat_statements
CREATE EXTENSION pg_stat_statements;

-- Find slow queries
SELECT
  calls,
  mean_exec_time,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 3. Auto-Scaling (AWS)

```hcl
# ECS Service auto-scaling
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_policy_cpu" {
  name               = "scale-on-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
```

---

## Quick Start: Deploy MVP Today

**1-Hour Setup (Heroku + Vercel):**

```bash
# Backend
cd backend
echo "web: node index.js" > Procfile
heroku create parkpal-api
heroku addons:create heroku-postgresql:essential-0
heroku config:set NODE_ENV=production JWT_SECRET=$(openssl rand -hex 32)
git push heroku main
heroku run npx prisma migrate deploy

# Web
cd ../frontend/web
vercel --prod

# Mobile
cd ../mobile
eas build:configure
eas build --platform android

# Done! 🎉
```

**Your apps are live:**
- API: https://parkpal-api.herokuapp.com
- Web: https://parkpal.vercel.app
- Mobile: Download APK from EAS build

---

## Recommendation

**For MVP (Week 1-6):** Heroku + Vercel + Supabase
- ✅ Fastest to deploy
- ✅ Minimal config
- ✅ $75-100/month
- ✅ Perfect for demo/testing

**For Production (Month 3+):** Migrate to AWS
- ✅ Better scaling
- ✅ Analytics infrastructure ready
- ✅ Cost-effective at scale
- ✅ Full control

**Start simple, scale smart!**


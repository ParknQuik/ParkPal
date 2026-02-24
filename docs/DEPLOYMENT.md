# ParkPal Deployment Guide

**Last Updated:** February 24, 2026
**Current Status:** ✅ Backend deployed, ⏳ Frontend pending

---

## Table of Contents

1. [Overview](#overview)
2. [Current Deployment Status](#current-deployment-status)
3. [GCP Infrastructure](#gcp-infrastructure)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Database Migrations](#database-migrations)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Troubleshooting](#troubleshooting)

---

## Overview

ParkPal uses **Google Cloud Platform (GCP)** for all infrastructure:

- **Backend**: Cloud Run (containerized Node.js)
- **Database**: Cloud SQL (PostgreSQL)
- **Caching**: Redis Cloud (external)
- **Storage**: Cloud Storage (photos)
- **Secrets**: Secret Manager
- **Frontend**: Firebase Hosting or Cloud Run (TBD)

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                     Production Setup                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (Web)          Frontend (Mobile)                  │
│  Firebase Hosting        EAS Build → App Stores             │
│        │                        │                            │
│        └────────────────────────┘                            │
│                 │                                            │
│                 ▼                                            │
│         Backend API (Cloud Run)                             │
│         parkpal-backend-dev                                 │
│         https://parkpal-backend-dev-*.run.app               │
│                 │                                            │
│         ┌───────┴───────┬──────────┬──────────┐            │
│         │               │          │          │             │
│         ▼               ▼          ▼          ▼             │
│   Cloud SQL      Secret Manager  GCS    Redis Cloud        │
│   PostgreSQL     (env vars)    (photos)  (caching)         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Current Deployment Status

### ✅ Backend - DEPLOYED
- **Service**: `parkpal-backend-dev`
- **URL**: https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app
- **Environment**: Development (dev branch)
- **Deployment Method**: GitHub Actions CI/CD (automated)
- **Status**: Operational
- **Health Check**: `/health` endpoint

**Recent Deployment:**
```bash
# Last successful deployment
Date: February 23, 2026
Run ID: #22319635044
Branch: dev
Status: ✅ Success
```

### ⏳ Frontend Web - NOT DEPLOYED
- **Status**: Workflow exists but deployment step incomplete
- **File**: `frontend/web/.github/workflows/deploy.yml`
- **Missing**: Actual deployment target configuration
- **Options**: Firebase Hosting, Vercel, or Cloud Run

### ⏳ Frontend Mobile - NOT DEPLOYED
- **Status**: EAS build workflow exists but not on main branch
- **File**: `.github/workflows/mobile-eas-build.yml`
- **Missing**: EXPO_TOKEN secret, workflow merge to main
- **Target**: iOS App Store + Google Play Store

---

## GCP Infrastructure

### Project Configuration

**Active Project:** `parkpal-474417` (Development)

```bash
gcloud config set project parkpal-474417
```

**Other Projects (Paused):**
- `parkpal-staging` - Staging environment (infrastructure created, not in use)
- `parkpal-production` - Production environment (not created yet)

### Service Account

**Name:** `parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com`

**IAM Roles:**
- `roles/artifactregistry.writer` - Push Docker images
- `roles/run.admin` - Manage Cloud Run services
- `roles/iam.serviceAccountUser` - Act as service account
- `roles/storage.admin` - Access Cloud Storage
- `roles/secretmanager.secretAccessor` - Read secrets
- `roles/cloudsql.client` - Connect to Cloud SQL

### Secrets in Secret Manager

```bash
# List all secrets
gcloud secrets list --project=parkpal-474417
```

**Current Secrets:**
1. `DATABASE_URL` - PostgreSQL connection string (Unix socket)
2. `JWT_SECRET` - JWT signing key
3. `REDIS_URL` - Redis connection string
4. `PAYMONGO_SECRET_KEY` - Payment processor secret
5. `PAYMONGO_PUBLIC_KEY` - Payment processor public key
6. `GOOGLE_MAPS_API_KEY` - Google Maps API key
7. `SMTP_HOST` - Email server host
8. `SMTP_PORT` - Email server port
9. `SMTP_USER` - Email credentials
10. `SMTP_PASS` - Email password

### Cloud SQL Database

**Instance:** `parkpal-db`
- **Region:** asia-southeast1
- **Version:** PostgreSQL 16
- **Tier:** db-custom-1-3840
- **Connection Name:** `parkpal-474417:asia-southeast1:parkpal-db`

**Databases:**
- `parknquik_staging` - Active database

### Cloud Storage Buckets

```bash
gsutil ls -p parkpal-474417
```

**Buckets:**
- `gs://parkpal-prod-photos` - User-uploaded photos
- `gs://parkpal-prod-backups` - Database backups

---

## Backend Deployment

### Automated Deployment (Current)

**Trigger:** Push to `dev`, `qa`, or `main` branch

**Workflow File:** `.github/workflows/deploy-backend.yml`

**Process:**
1. Checkout code
2. Authenticate to GCP
3. Build Docker image with Prisma
4. Push to Google Container Registry
5. Run database migrations (Cloud Run Job)
6. Deploy to Cloud Run
7. Health check verification

**Deployment Time:** ~3 minutes

### Manual Deployment

If you need to deploy manually:

```bash
cd /Users/bryanangeloyaneza/Documents/GitHub/ParkPal

# 1. Build and push Docker image
gcloud builds submit --tag gcr.io/parkpal-474417/parkpal-backend:latest \
  --project=parkpal-474417 backend/

# 2. Deploy to Cloud Run
gcloud run deploy parkpal-backend-dev \
  --image gcr.io/parkpal-474417/parkpal-backend:latest \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com \
  --set-cloudsql-instances parkpal-474417:asia-southeast1:parkpal-db \
  --set-env-vars NODE_ENV=development,GCP_PROJECT_ID=parkpal-474417,GCS_BUCKET_NAME=parkpal-prod-photos \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,REDIS_URL=REDIS_URL:latest,PAYMONGO_SECRET_KEY=PAYMONGO_SECRET_KEY:latest,PAYMONGO_PUBLIC_KEY=PAYMONGO_PUBLIC_KEY:latest,GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest,SMTP_HOST=SMTP_HOST:latest,SMTP_PORT=SMTP_PORT:latest,SMTP_USER=SMTP_USER:latest,SMTP_PASS=SMTP_PASS:latest \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --concurrency 80 \
  --project parkpal-474417

# 3. Verify deployment
curl https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/health
```

### Environment-Specific Configurations

| Branch | Environment | Service Name | Instances | Memory | CPU |
|--------|-------------|--------------|-----------|--------|-----|
| `dev` | Development | `parkpal-backend-dev` | 0-5 | 512Mi | 1 |
| `qa` | Staging | `parkpal-backend-staging` | 0-10 | 512Mi | 1 |
| `main` | Production | `parkpal-backend-prod` | 1-100 | 1Gi | 2 |

---

## Frontend Deployment

### Web App (Pending Setup)

**Option 1: Firebase Hosting (Recommended)**

```bash
cd frontend/web

# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init hosting

# Build and deploy
npm run build
firebase deploy --only hosting --project parkpal-474417
```

**Option 2: Vercel**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend/web
vercel --prod
```

**Option 3: Cloud Run (Containerized)**

```bash
# Build and deploy as container
cd frontend/web
gcloud builds submit --tag gcr.io/parkpal-474417/parkpal-web:latest
gcloud run deploy parkpal-web \
  --image gcr.io/parkpal-474417/parkpal-web:latest \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated
```

### Mobile App (Pending Setup)

**EAS Build Setup:**

```bash
cd frontend/mobile

# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

**GitHub Secrets Required:**
- `EXPO_TOKEN` - Expo authentication token

---

## Database Migrations

### Automated Migrations (CI/CD)

Migrations run automatically before each deployment via Cloud Run Job.

**Job Configuration:**
```bash
gcloud run jobs create parkpal-backend-migrate-dev-10 \
  --image gcr.io/parkpal-474417/parkpal-backend:latest \
  --region asia-southeast1 \
  --set-secrets DATABASE_URL=DATABASE_URL:latest \
  --set-cloudsql-instances parkpal-474417:asia-southeast1:parkpal-db \
  --service-account parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com \
  --args="sh,-c,cd /app && npx prisma migrate deploy --skip-generate" \
  --max-retries 1 \
  --task-timeout 10m \
  --project parkpal-474417
```

### Manual Migrations

If you need to run migrations manually:

```bash
# Option 1: Via Cloud Run Job
gcloud run jobs execute parkpal-backend-migrate-dev-10 \
  --region asia-southeast1 \
  --wait \
  --project parkpal-474417

# Option 2: Via Cloud SQL Proxy (local)
# 1. Start proxy
gcloud sql instances describe parkpal-db \
  --project=parkpal-474417 \
  --format="value(connectionName)"

cloud-sql-proxy parkpal-474417:asia-southeast1:parkpal-db

# 2. Run migrations
cd backend
DATABASE_URL="postgresql://USER:PASS@127.0.0.1:5432/parknquik_staging" \
  npx prisma migrate deploy
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

**File:** `.github/workflows/deploy-backend.yml`

**Triggers:**
- Push to `dev`, `qa`, or `main` branches
- Changes in `backend/**` or workflow file

**Workflow Steps:**

```yaml
1. Checkout Repository
2. Authenticate to GCP
   - Uses GCP_SA_KEY secret
3. Configure Docker for GCR
4. Build Docker Image
   - Multi-stage build
   - Prisma client generation
5. Push to Container Registry
6. Run Database Migrations
   - Cloud Run Job execution
7. Deploy to Cloud Run
   - Environment-specific config
8. Health Check
9. Generate Deployment Summary
```

**GitHub Secrets Required:**
- `GCP_SA_KEY` - Service account key JSON (base64 encoded)
- `GCP_PROJECT_ID` - Project ID (`parkpal-474417`)

### Deployment Metrics

**Speed Comparison:**
- **Manual Deployment:** ~30 minutes
- **Automated Deployment:** ~3 minutes
- **Improvement:** 90% faster

**Build Breakdown:**
```
Checkout code:         5s
Authenticate GCP:      20s
Build Docker image:    90s
Push to GCR:          30s
Database migration:    15s
Deploy to Cloud Run:   15s
Health check:          5s
────────────────────────
Total:                ~3 minutes
```

---

## Troubleshooting

### Common Issues

#### 1. Deployment Fails with "Permission Denied"

**Cause:** Service account missing IAM roles

**Fix:**
```bash
gcloud projects get-iam-policy parkpal-474417 \
  --flatten="bindings[].members" \
  --filter="bindings.members:parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com"

# Add missing roles
gcloud projects add-iam-policy-binding parkpal-474417 \
  --member="serviceAccount:parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com" \
  --role="roles/run.admin"
```

#### 2. Health Check Returns "degraded"

**Cause:** Database, Redis, or Secret Manager not accessible

**Check Logs:**
```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=parkpal-backend-dev" \
  --limit 50 \
  --project parkpal-474417 \
  --format="table(timestamp,severity,textPayload)"
```

**Check Health:**
```bash
curl https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/health | jq
```

**Common Fixes:**
- Verify DATABASE_URL secret format: `postgresql://USER:PASS@localhost/DB?host=/cloudsql/CONNECTION_NAME`
- Check Redis connection string
- Verify Secret Manager IAM permissions

#### 3. Database Connection Fails

**Cause:** Incorrect connection string or missing Cloud SQL connection

**Fix:**
```bash
# Get correct connection name
gcloud sql instances describe parkpal-db \
  --project=parkpal-474417 \
  --format="value(connectionName)"

# Update DATABASE_URL secret
echo -n "postgresql://USER:PASS@localhost/parknquik_staging?host=/cloudsql/parkpal-474417:asia-southeast1:parkpal-db" | \
  gcloud secrets versions add DATABASE_URL --data-file=- --project=parkpal-474417

# Redeploy
gh workflow run deploy-backend.yml --ref dev -f environment=development
```

#### 4. Prisma Client Not Found

**Cause:** Prisma client not generated in Docker build

**Fix:** Verify Dockerfile includes:
```dockerfile
RUN npx prisma generate
```

And deployment includes:
```bash
--args="sh,-c,cd /app && npx prisma migrate deploy --skip-generate"
```

#### 5. Workflow Doesn't Trigger

**Cause:** Branch protection or paths filter

**Check:**
- Push is to `dev`, `qa`, or `main`
- Changes are in `backend/**` or `.github/workflows/`
- Branch protection allows automated workflows

**Manual Trigger:**
```bash
gh workflow run deploy-backend.yml --ref dev -f environment=development
```

### Viewing Logs

**Cloud Run Logs:**
```bash
# Stream logs
gcloud run services logs tail parkpal-backend-dev \
  --region asia-southeast1 \
  --project parkpal-474417

# Search logs
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=parkpal-backend-dev AND severity=ERROR" \
  --limit 10 \
  --project parkpal-474417 \
  --format=json
```

**GitHub Actions Logs:**
```bash
# View recent runs
gh run list --workflow=deploy-backend.yml --limit 5

# View specific run
gh run view RUN_ID --log
```

### Health Check Endpoints

**Backend Health:**
```bash
curl https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "environment": "development",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": null
    },
    "redis": {
      "status": "down",
      "error": "Redis not available"
    },
    "secretManager": {
      "status": "down"
    }
  }
}
```

---

## Cost Estimates

### Current Monthly Costs (Development)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| Cloud SQL | db-custom-1-3840 | $80 |
| Cloud Run | 0-10 instances | $0-15 |
| Cloud Storage | 2 buckets | $2 |
| Secret Manager | 10 secrets | $0 (free tier) |
| Redis Cloud | External | $5 |
| **Total** | | **~$87-102** |

### Production Estimates (Future)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| Cloud SQL | High availability | $300-500 |
| Cloud Run | 1-100 instances | $50-200 |
| Cloud Storage | Photos + backups | $10-50 |
| Firebase Hosting | Free tier | $0 |
| **Total** | | **~$360-750** |

---

## Next Steps

### Immediate (Blocking)
1. ✅ Backend deployed to Cloud Run
2. ⏳ Deploy web frontend (Firebase Hosting or Vercel)
3. ⏳ Setup mobile EAS builds
4. ⏳ Configure Redis connection (currently down)

### Short Term (This Week)
5. Test staging deployment (`qa` branch)
6. Add monitoring/alerting
7. Setup custom domain
8. Configure CORS properly

### Medium Term (Before Beta Launch)
9. Submit mobile apps to stores
10. Load testing validation
11. Production environment setup
12. Beta user rollout plan

---

**Deployment Status:** 🟡 Partially Deployed (Backend only)
**Next Priority:** Frontend deployment infrastructure
**Contact:** Development Team

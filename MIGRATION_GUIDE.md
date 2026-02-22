# ParkPal Migration - 4 Week Accelerated Plan

**Timeline:** 4 weeks (28 days)
**Pace:** 2-4 hours per day (intensive)
**Starting Point:** GCP account already exists with Google Maps API
**Cost:** ~$175/month starting Month 1

---

## 📊 Migration Progress Tracker

**Last Updated:** February 22, 2026
**Current Status:** Week 1, Day 3-4 (90% complete)
**Project ID:** parkpal-474417
**Backend URL:** https://parkpal-backend-dev-242395665565.asia-southeast1.run.app

### Week 1: Infrastructure Setup (Days 1-7)

#### ✅ Day 1: GCP Project & Cloud SQL (COMPLETE)
- [x] GCP project created: `parkpal-474417`
- [x] Authenticated: bryanangeloyaneza@gmail.com
- [x] Enabled APIs (SQL, Storage, Secrets, Run, Build, Logging, Monitoring)
- [x] Cloud SQL instance created: `parkpal-db` (RUNNING)
- [x] Databases created: `parknquik_staging`, `parknquik_production`
- [x] Service account created: `parkpal-backend-service`

#### ✅ Day 2: Redis + Storage + Secrets (COMPLETE - 100%)
- [x] APIs enabled
- [x] Redis Cloud setup (redis-19930.crce272.asia-seast1-1.gcp.cloud.redislabs.com:19930)
- [x] REDIS_URL secret created in Secret Manager
- [x] GCS buckets created (`parkpal-prod-photos`, `parkpal-prod-documents`, `parkpal-prod-backups`)
- [x] CORS configuration for photos bucket
- [x] Lifecycle rules (delete temp uploads after 1 day)
- [x] Service account key downloaded to `~/.gcp/parkpal-sa-key.json`
- [x] All secrets created in Secret Manager (JWT, DATABASE_URL, REDIS_URL, PayMongo, Maps)

#### ✅ Day 3-4: Docker + CI/CD (COMPLETE - Feb 22, 2026)
- [x] `Dockerfile.production` created and optimized
- [x] `cloudbuild.yaml` created for GCP Cloud Build
- [x] Prisma schema fixed (added linux-musl binary targets)
- [x] First successful deployment to Cloud Run (parkpal-backend-dev)
- [x] Backend deployed: https://parkpal-backend-dev-242395665565.asia-southeast1.run.app
- [x] Swagger API docs accessible: `/api-docs`

#### ⏳ Day 5-7: Domain + Firebase + Expo (PENDING)
- [ ] Domain registered
- [ ] Firebase initialized
- [ ] EAS/Expo configured

### Week 2: Staging Deployment (Days 8-14) - NOT STARTED

### Week 3: Testing & Beta (Days 15-21) - NOT STARTED

### Week 4: Production Launch (Days 22-28) - NOT STARTED

---

## Overview

Since you already have GCP set up, we'll skip account creation and jump straight into infrastructure deployment.

**Your Current Status:**
- ✅ GCP account exists
- ✅ Google Maps API configured
- ✅ Backend code ready (150 tests passing)
- ✅ Mobile app ready (45 tests passing)
- ✅ Web app ready
- ⏳ No cloud infrastructure yet
- ⏳ No staging environment
- ⏳ No production deployment

**4-Week Timeline:**

| Week | Focus | Deliverable |
|------|-------|-------------|
| **Week 1** | Infrastructure Setup | Cloud SQL + Redis + Storage + CI/CD |
| **Week 2** | Staging Deployment | Backend + Web + Mobile on staging |
| **Week 3** | Testing & Beta | Validate + 25 beta testers |
| **Week 4** | Production Launch | Live on production + app stores |

---

## Week 1: Infrastructure Setup (Days 1-7)

**Goal:** Set up all GCP infrastructure
**Daily commitment:** 2-3 hours
**Cost this week:** $40

---

### Day 1 (Saturday): GCP Project & Cloud SQL

**Time: 2-3 hours**

#### Morning (1-1.5 hours): GCP Project Setup

**Since you have GCP account, create new project:**

```bash
# Install gcloud CLI if not installed
# macOS: brew install google-cloud-sdk
# Already installed? Skip this

# Login to GCP
gcloud auth login
# Opens browser, sign in with your Google account

# Create new project
gcloud projects create parkpal-production --name="ParkPal Production"

# Set as active project
gcloud config set project parkpal-production

# Link billing account (you'll be prompted to choose one)
gcloud beta billing projects link parkpal-production \
  --billing-account=YOUR_BILLING_ACCOUNT_ID

# To find your billing account ID:
gcloud beta billing accounts list
# Copy the ACCOUNT_ID from output
```

**Set up budget alert:**

```bash
# Go to GCP Console: https://console.cloud.google.com/billing
# Click "Budgets & alerts" > "Create budget"
# Budget name: Monthly Budget
# Amount: $500
# Alert thresholds: 50%, 75%, 90%, 100%
# Email: your-email@example.com
```

**Enable required APIs (all at once):**

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  containerregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project=parkpal-production

# Takes 1-2 minutes
```

---

#### Afternoon (1-1.5 hours): Cloud SQL Setup

**Create PostgreSQL instance:**

```bash
# Generate strong password
POSTGRES_PASSWORD=$(openssl rand -base64 32)
echo "Save this password: $POSTGRES_PASSWORD"
# SAVE THIS PASSWORD SOMEWHERE SAFE!

# Create Cloud SQL instance (optimized for cost)
gcloud sql instances create parkpal-db \
  --database-version=POSTGRES_16 \
  --tier=db-custom-2-7680 \
  --region=asia-southeast1 \
  --availability-type=REGIONAL \
  --storage-type=SSD \
  --storage-size=20GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --retained-backups-count=7 \
  --root-password="$POSTGRES_PASSWORD" \
  --project=parkpal-production

# This takes 5-10 minutes
# ☕ Take a coffee break
```

**While waiting, save this info:**

```
Project ID: parkpal-production
Database Instance: parkpal-db
Region: asia-southeast1
Root Password: [from above]
```

**Create databases:**

```bash
# Create staging database
gcloud sql databases create parknquik_staging \
  --instance=parkpal-db

# Create production database
gcloud sql databases create parknquik_production \
  --instance=parkpal-db

# Create database users
# Staging user password
STAGING_PASSWORD=$(openssl rand -base64 32)
echo "Staging password: $STAGING_PASSWORD"

gcloud sql users create parkpal_staging \
  --instance=parkpal-db \
  --password="$STAGING_PASSWORD"

# Production user password
PROD_PASSWORD=$(openssl rand -base64 32)
echo "Production password: $PROD_PASSWORD"

gcloud sql users create parkpal_prod \
  --instance=parkpal-db \
  --password="$PROD_PASSWORD"
```

**Get connection name:**

```bash
gcloud sql instances describe parkpal-db \
  --format="value(connectionName)"

# Output: parkpal-production:asia-southeast1:parkpal-db
# SAVE THIS!
```

**Test connection:**

```bash
# Install Cloud SQL Proxy
# macOS:
brew install cloud-sql-proxy

# Start proxy in background
cloud-sql-proxy parkpal-production:asia-southeast1:parkpal-db &
PROXY_PID=$!

# Wait 5 seconds
sleep 5

# Test connection
psql "host=127.0.0.1 port=5432 dbname=parknquik_staging user=parkpal_staging password=$STAGING_PASSWORD"

# If you see: parknquik_staging=>
# Type: \q to exit
# Success! ✅

# Kill proxy
kill $PROXY_PID
```

✅ **Day 1 Complete!** Cloud SQL is ready.

---

### Day 2 (Sunday): Redis + Storage + Secrets

**Time: 2-3 hours**

#### Morning (1 hour): Redis Setup

**Use Redis Cloud (cheapest option):**

```bash
# 1. Go to https://redis.com/try-free/
# 2. Sign up (use your Google account)
# 3. Create subscription:
#    - Cloud: Google Cloud
#    - Region: asia-southeast1
#    - Plan: Essentials ($5/month)
# 4. Create database:
#    - Name: parkpal-redis-prod
#    - Password: Generate strong password

# Save these details:
Host: redis-12345.c123.asia-southeast1-1.gce.cloud.redislabs.com
Port: 12345
Password: YOUR_REDIS_PASSWORD

# Connection string format:
redis://:YOUR_REDIS_PASSWORD@redis-12345.c123.asia-southeast1-1.gce.cloud.redislabs.com:12345
```

**Test Redis:**

```bash
# Install redis-cli
brew install redis

# Test connection
redis-cli -h redis-12345.c123.asia-southeast1-1.gce.cloud.redislabs.com \
  -p 12345 \
  -a YOUR_REDIS_PASSWORD

# If connected, type:
PING
# Response: PONG ✅

# Exit:
exit
```

---

#### Afternoon (1-2 hours): Cloud Storage + Secrets

**Create storage buckets:**

```bash
# Photos bucket
gsutil mb -l asia-southeast1 -c STANDARD gs://parkpal-prod-photos

# Documents bucket
gsutil mb -l asia-southeast1 -c STANDARD gs://parkpal-prod-documents

# Backups bucket (nearline for cheaper storage)
gsutil mb -l asia-southeast1 -c NEARLINE gs://parkpal-prod-backups

# Test upload
echo "Test" > test.txt
gsutil cp test.txt gs://parkpal-prod-photos/
gsutil ls gs://parkpal-prod-photos/
gsutil rm gs://parkpal-prod-photos/test.txt
rm test.txt

# Success! ✅
```

**Create service account:**

```bash
# Create service account
gcloud iam service-accounts create parkpal-backend \
  --display-name="ParkPal Backend Service"

# Get service account email
SA_EMAIL=$(gcloud iam service-accounts list \
  --filter="displayName:ParkPal Backend Service" \
  --format="value(email)")

echo "Service account: $SA_EMAIL"
# Output: parkpal-backend@parkpal-production.iam.gserviceaccount.com

# Grant permissions
gcloud projects add-iam-policy-binding parkpal-production \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding parkpal-production \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding parkpal-production \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding parkpal-production \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/logging.logWriter"

# Create key for local testing
mkdir -p ~/.gcp
gcloud iam service-accounts keys create ~/.gcp/parkpal-sa-key.json \
  --iam-account=$SA_EMAIL

chmod 600 ~/.gcp/parkpal-sa-key.json
```

**Set up Secret Manager:**

```bash
# Generate JWT secret (128 characters)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo "JWT Secret: $JWT_SECRET"
# SAVE THIS!

# Create secrets
echo -n "$JWT_SECRET" | \
  gcloud secrets create JWT_SECRET --data-file=-

# Database URLs
echo -n "postgresql://parkpal_staging:$STAGING_PASSWORD@/parknquik_staging?host=/cloudsql/parkpal-production:asia-southeast1:parkpal-db" | \
  gcloud secrets create DATABASE_URL_STAGING --data-file=-

echo -n "postgresql://parkpal_prod:$PROD_PASSWORD@/parknquik_production?host=/cloudsql/parkpal-production:asia-southeast1:parkpal-db" | \
  gcloud secrets create DATABASE_URL_PRODUCTION --data-file=-

# Redis URL
echo -n "redis://:YOUR_REDIS_PASSWORD@redis-12345.c123.asia-southeast1-1.gce.cloud.redislabs.com:12345" | \
  gcloud secrets create REDIS_URL --data-file=-

# PayMongo (use your existing keys)
echo -n "YOUR_PAYMONGO_SECRET_KEY" | \
  gcloud secrets create PAYMONGO_SECRET_KEY --data-file=-

echo -n "YOUR_PAYMONGO_PUBLIC_KEY" | \
  gcloud secrets create PAYMONGO_PUBLIC_KEY --data-file=-

# Google Maps (use your existing key)
echo -n "YOUR_GOOGLE_MAPS_API_KEY" | \
  gcloud secrets create GOOGLE_MAPS_API_KEY --data-file=-

# Grant access to service account
for SECRET in JWT_SECRET DATABASE_URL_STAGING DATABASE_URL_PRODUCTION REDIS_URL PAYMONGO_SECRET_KEY PAYMONGO_PUBLIC_KEY GOOGLE_MAPS_API_KEY
do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/secretmanager.secretAccessor"
done

# Test secret access
gcloud secrets versions access latest --secret="JWT_SECRET"
# Should output your 128-char JWT secret ✅
```

✅ **Day 2 Complete!** Infrastructure is ready.

**Save all your credentials in a secure note:**

```
GCP Project: parkpal-production
Cloud SQL Connection: parkpal-production:asia-southeast1:parkpal-db
Staging DB: parknquik_staging / parkpal_staging / [password]
Production DB: parknquik_production / parkpal_prod / [password]
Redis URL: redis://:[password]@[host]:[port]
Service Account: parkpal-backend@parkpal-production.iam.gserviceaccount.com
JWT Secret: [128 chars]
```

---

### Day 3-4 (Mon-Tue): Docker + CI/CD Setup

**Time: 2 hours each day (4 hours total)**

#### Day 3 Morning: Create Production Dockerfile

```bash
cd ~/Documents/GitHub/ParkPal/backend

# Create Dockerfile.production
cat > Dockerfile.production << 'EOF'
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && npm cache clean --force
RUN npx prisma generate
COPY . .

FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app .

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
EOF
```

**Test Docker build locally:**

```bash
# Build
docker build -f Dockerfile.production -t parkpal-backend:test .
# Takes 3-5 minutes

# Success! ✅
# Clean up
docker rmi parkpal-backend:test
```

---

#### Day 3 Afternoon: Create Environment Files

```bash
# Still in backend directory

# Create .env.staging
cat > .env.staging << EOF
NODE_ENV=staging
PORT=8080
DATABASE_URL=postgresql://parkpal_staging:PASSWORD@/parknquik_staging?host=/cloudsql/parkpal-production:asia-southeast1:parkpal-db
REDIS_URL=redis://:PASSWORD@HOST:PORT
JWT_SECRET=YOUR_128_CHAR_SECRET
PAYMONGO_SECRET_KEY=sk_test_YOUR_KEY
PAYMONGO_PUBLIC_KEY=pk_test_YOUR_KEY
GOOGLE_MAPS_API_KEY=YOUR_MAPS_KEY
GCP_PROJECT_ID=parkpal-production
GCS_BUCKET_NAME=parkpal-prod-photos
ENABLE_SECRET_MANAGER=true
CORS_ORIGIN=https://parkpal-staging.web.app
EMAIL_FROM=noreply@parkpal.com
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EOF

# Create .env.production (similar but with live keys)
cp .env.staging .env.production
# Edit .env.production:
# - Change NODE_ENV to production
# - Use pk_live_ keys for PayMongo
# - Change CORS_ORIGIN to https://parkpal.com

# Add to .gitignore
echo ".env.staging" >> .gitignore
echo ".env.production" >> .gitignore

# Commit Dockerfile
git add Dockerfile.production
git commit -m "feat: add production Dockerfile"
```

---

#### Day 4: GitHub Actions CI/CD

```bash
cd ~/Documents/GitHub/ParkPal

# Create GitHub Actions workflow
mkdir -p .github/workflows

cat > .github/workflows/deploy-staging.yml << 'EOF'
name: Deploy to Staging

on:
  push:
    branches: [dev]
  workflow_dispatch:

env:
  GCP_PROJECT_ID: parkpal-production
  GCP_REGION: asia-southeast1
  SERVICE_NAME: parkpal-backend-staging

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: parknquik_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - working-directory: backend
        run: npm ci
      - working-directory: backend
        run: npx prisma generate
      - working-directory: backend
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/parknquik_test
      - working-directory: backend
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/parknquik_test
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test
          JWT_SECRET: test-secret-key-for-ci

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/setup-gcloud@v2
      - run: gcloud auth configure-docker
      - working-directory: backend
        run: |
          docker build -f Dockerfile.production \
            -t gcr.io/${{ env.GCP_PROJECT_ID }}/parkpal-backend:staging-${{ github.sha }} \
            -t gcr.io/${{ env.GCP_PROJECT_ID }}/parkpal-backend:staging-latest .
      - run: |
          docker push gcr.io/${{ env.GCP_PROJECT_ID }}/parkpal-backend:staging-${{ github.sha }}
          docker push gcr.io/${{ env.GCP_PROJECT_ID }}/parkpal-backend:staging-latest
      - run: |
          gcloud run deploy ${{ env.SERVICE_NAME }} \
            --image gcr.io/${{ env.GCP_PROJECT_ID }}/parkpal-backend:staging-${{ github.sha }} \
            --region ${{ env.GCP_REGION }} \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars NODE_ENV=staging,GCP_PROJECT_ID=${{ env.GCP_PROJECT_ID }},GCS_BUCKET_NAME=parkpal-prod-photos \
            --set-secrets DATABASE_URL=DATABASE_URL_STAGING:latest,JWT_SECRET=JWT_SECRET:latest,REDIS_URL=REDIS_URL:latest,PAYMONGO_SECRET_KEY=PAYMONGO_SECRET_KEY:latest,GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest \
            --add-cloudsql-instances parkpal-production:asia-southeast1:parkpal-db \
            --service-account parkpal-backend@${{ env.GCP_PROJECT_ID }}.iam.gserviceaccount.com \
            --min-instances 1 \
            --max-instances 10 \
            --memory 512Mi \
            --cpu 1 \
            --timeout 300 \
            --concurrency 80
EOF

# Commit
git add .github/workflows/deploy-staging.yml
git commit -m "ci: add staging deployment workflow"
```

**Add GitHub secrets:**

```bash
# 1. Go to your GitHub repo
# 2. Settings > Secrets and variables > Actions > New repository secret
# 3. Add these secrets:

Name: GCP_SA_KEY
Value: (paste contents of ~/.gcp/parkpal-sa-key.json)

Name: GCP_PROJECT_ID
Value: parkpal-production

Name: CLOUD_SQL_INSTANCE
Value: parkpal-production:asia-southeast1:parkpal-db
```

**Push to trigger first deployment:**

```bash
# Make sure you're on dev branch
git checkout dev

# Push
git push origin dev

# Watch deployment at:
# https://github.com/YOUR_USERNAME/ParkPal/actions
# Takes 5-10 minutes
```

✅ **Day 3-4 Complete!** CI/CD is set up.

---

### Day 5-7 (Wed-Fri): Domain + Firebase + Expo

**Time: 1.5 hours per day**

#### Day 5: Domain Registration

```bash
# Option 1: Google Domains
# 1. Go to https://domains.google.com
# 2. Search: parkpal.com (or alternative)
# 3. Purchase (~$12/year)

# Option 2: Namecheap
# Similar process, ~$10/year

# For now, just register domain
# We'll configure DNS in Week 2 when we deploy

# Save:
Domain: parkpal.com (or your chosen domain)
Registrar: Google Domains
Status: Registered ✅
```

---

#### Day 6: Firebase Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Create Firebase project
# 1. Go to https://console.firebase.google.com
# 2. Add project > Use existing project
# 3. Select: parkpal-production
# 4. Enable Google Analytics (optional)

# Initialize in web app
cd ~/Documents/GitHub/ParkPal/frontend/web
firebase init

# Select:
# - Hosting
# - Use existing project: parkpal-production
# - Public directory: build
# - Single-page app: Yes
# - Overwrite index.html: No

# Firebase config created in firebase.json
```

**Update firebase.json:**

```json
{
  "hosting": {
    "public": "build",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
        "headers": [{"key": "Cache-Control", "value": "max-age=31536000"}]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [{"key": "Cache-Control", "value": "max-age=31536000"}]
      }
    ]
  }
}
```

---

#### Day 7: Expo/EAS Setup

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
cd ~/Documents/GitHub/ParkPal/frontend/mobile
npx expo login
# Create account if you don't have one

# Initialize EAS
eas init
# Project name: ParkPal

# Create eas.json
cat > eas.json << 'EOF'
{
  "cli": {"version": ">= 5.0.0"},
  "build": {
    "staging": {
      "distribution": "internal",
      "channel": "staging",
      "env": {
        "API_URL": "STAGING_URL_HERE"
      },
      "ios": {
        "simulator": false,
        "bundleIdentifier": "com.parkpal.staging"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store",
      "channel": "production",
      "env": {
        "API_URL": "https://api.parkpal.com"
      },
      "ios": {
        "bundleIdentifier": "com.parkpal.app"
      },
      "android": {
        "buildType": "aab"
      }
    }
  }
}
EOF

# Commit
git add eas.json
git commit -m "feat: configure EAS build"
```

✅ **Week 1 Complete!** All infrastructure ready.

**Week 1 Summary:**
- ✅ GCP project created
- ✅ Cloud SQL PostgreSQL running
- ✅ Redis Cloud configured
- ✅ Cloud Storage buckets created
- ✅ Service account + secrets set up
- ✅ CI/CD pipeline configured
- ✅ Domain registered
- ✅ Firebase initialized
- ✅ Expo/EAS configured

**Cost so far:** ~$40

---

## Week 2: Staging Deployment (Days 8-14)

**Goal:** Deploy everything to staging
**Daily commitment:** 2-4 hours
**Cost this week:** $112 (staging running)

---

### Day 8 (Saturday): Deploy Backend to Staging

**Time: 2-3 hours**

#### Morning: First Deployment

```bash
# Your CI/CD should have already deployed from Day 4's push
# But let's manually deploy to ensure it's working

cd ~/Documents/GitHub/ParkPal

# Trigger deployment
git checkout dev
echo "# Deploy $(date)" >> DEPLOYMENT_LOG.md
git add DEPLOYMENT_LOG.md
git commit -m "chore: trigger staging deployment"
git push origin dev

# Watch GitHub Actions:
# https://github.com/YOUR_USERNAME/ParkPal/actions
# Wait for "Deploy to Staging" to complete (~5-10 minutes)
```

**Get staging URL:**

```bash
gcloud run services describe parkpal-backend-staging \
  --region=asia-southeast1 \
  --format='value(status.url)'

# Output: https://parkpal-backend-staging-xxxxx-uc.a.run.app
# SAVE THIS URL!
```

---

#### Afternoon: Run Migrations & Seed Data

**Run database migrations:**

```bash
# Create migration job
gcloud run jobs create parkpal-migrate-staging \
  --image gcr.io/parkpal-production/parkpal-backend:staging-latest \
  --region=asia-southeast1 \
  --set-secrets DATABASE_URL=DATABASE_URL_STAGING:latest \
  --add-cloudsql-instances parkpal-production:asia-southeast1:parkpal-db \
  --service-account parkpal-backend@parkpal-production.iam.gserviceaccount.com \
  --command="npx,prisma,migrate,deploy"

# Execute migration
gcloud run jobs execute parkpal-migrate-staging \
  --region=asia-southeast1 \
  --wait

# Success! ✅
```

**Create staging seed data:**

```bash
cd ~/Documents/GitHub/ParkPal/backend

# Create prisma/seed-staging.js
cat > prisma/seed-staging.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding staging database...');

  const hashedPassword = await bcrypt.hash('TestPass123!', 10);

  // Test users
  await prisma.user.create({
    data: {
      email: 'driver@test.parkpal.com',
      password: hashedPassword,
      name: 'Test Driver',
      role: 'driver',
      emailVerified: true,
    },
  });

  await prisma.user.create({
    data: {
      email: 'host@test.parkpal.com',
      password: hashedPassword,
      name: 'Test Host',
      role: 'host',
      emailVerified: true,
    },
  });

  // Test zones
  await prisma.zone.createMany({
    data: [
      {
        name: 'SM Mall of Asia',
        type: 'commercial',
        address: 'Pasay City',
        city: 'Manila',
        centerLat: 14.5350,
        centerLon: 120.9818,
        radiusMeters: 500,
        totalCapacity: 1000,
        pricePerHour: 60.00,
        isActive: true,
        geofencePolygon: JSON.stringify({
          type: 'Polygon',
          coordinates: [[[120.9793, 14.5375], [120.9843, 14.5375], [120.9843, 14.5325], [120.9793, 14.5325], [120.9793, 14.5375]]],
        }),
      },
      {
        name: 'BGC Central',
        type: 'commercial',
        address: 'Taguig City',
        city: 'Taguig',
        centerLat: 14.5547,
        centerLon: 121.0244,
        radiusMeters: 300,
        totalCapacity: 500,
        pricePerHour: 80.00,
        isActive: true,
        geofencePolygon: JSON.stringify({
          type: 'Polygon',
          coordinates: [[[121.0219, 14.5572], [121.0269, 14.5572], [121.0269, 14.5522], [121.0219, 14.5522], [121.0219, 14.5572]]],
        }),
      },
    ],
  });

  console.log('✅ Staging data seeded');
  console.log('📧 Login: driver@test.parkpal.com / TestPass123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
EOF

# Add script to package.json
# Edit backend/package.json and add:
# "seed:staging": "node prisma/seed-staging.js"

# Commit
git add prisma/seed-staging.js package.json
git commit -m "feat: add staging seed data"
git push origin dev

# Wait for rebuild (~5 min)

# Create seed job
gcloud run jobs create parkpal-seed-staging \
  --image gcr.io/parkpal-production/parkpal-backend:staging-latest \
  --region=asia-southeast1 \
  --set-secrets DATABASE_URL=DATABASE_URL_STAGING:latest \
  --add-cloudsql-instances parkpal-production:asia-southeast1:parkpal-db \
  --service-account parkpal-backend@parkpal-production.iam.gserviceaccount.com \
  --command="npm,run,seed:staging"

# Run seeding
gcloud run jobs execute parkpal-seed-staging \
  --region=asia-southeast1 \
  --wait
```

**Test backend API:**

```bash
STAGING_URL="https://parkpal-backend-staging-xxxxx-uc.a.run.app"

# Health check
curl $STAGING_URL/health
# Expected: {"status":"ok","database":"up","redis":"up"}

# Test parking spots endpoint
curl "$STAGING_URL/api/v1/parking/spots?lat=14.5547&lon=121.0244&radius=5000"
# Should return zones from seed data

# Success! ✅
```

✅ **Day 8 Complete!** Backend is live on staging.

---

### Day 9-10 (Sun-Mon): Deploy Web App

**Time: 2 hours each day**

#### Day 9: Build & Deploy Web

```bash
cd ~/Documents/GitHub/ParkPal/frontend/web

# Update staging API URL in eas.json first!
STAGING_URL="https://parkpal-backend-staging-xxxxx-uc.a.run.app"

# Build
REACT_APP_API_URL=$STAGING_URL \
REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_MAPS_KEY \
REACT_APP_PAYMONGO_PUBLIC_KEY=pk_test_YOUR_KEY \
npm run build

# Deploy to Firebase
firebase deploy --only hosting

# Output:
# ✔  Deploy complete!
# Hosting URL: https://parkpal-production.web.app
```

**Test web app:**

```bash
# Open in browser
open https://parkpal-production.web.app

# Test:
# - Homepage loads ✅
# - Search works ✅
# - Can view parking spots ✅
```

---

#### Day 10: Mobile App Builds (Staging)

```bash
cd ~/Documents/GitHub/ParkPal/frontend/mobile

# Update eas.json with staging URL
# Edit eas.json and replace "STAGING_URL_HERE" with actual URL

# Build for iOS (staging)
eas build --profile staging --platform ios
# Takes 15-20 minutes
# You'll be prompted for Apple ID

# Build for Android (staging)
eas build --profile staging --platform android
# Takes 10-15 minutes
```

**While builds are running, you can continue with other tasks.**

✅ **Day 9-10 Complete!** Web deployed, mobile builds in progress.

---

### Day 11-14: Testing & Monitoring

**Time: 1-2 hours per day**

#### Day 11: Manual Testing

**Test all critical flows:**

```bash
# Use web app + mobile apps when builds complete

Driver Flow:
- [ ] Sign up at https://parkpal-production.web.app
- [ ] Verify email
- [ ] Login
- [ ] Search for parking (map view)
- [ ] View spot details
- [ ] Create booking
- [ ] Complete payment (use test card: 4343434343434345)
- [ ] View "My Bookings"

Host Flow:
- [ ] Sign up as host
- [ ] List parking spot
- [ ] Upload photo (test GCS upload)
- [ ] Set price & availability
- [ ] Publish listing
- [ ] View earnings

# Report any bugs found
```

---

#### Day 12: Set Up Monitoring

```bash
# Create uptime check
gcloud monitoring uptime create parkpal-staging-health \
  --display-name="ParkPal Staging Health" \
  --resource-type=uptime-url \
  --protocol=HTTPS \
  --timeout=10s \
  --period=60s \
  --http-check-host=parkpal-backend-staging-xxxxx-uc.a.run.app \
  --http-request-path=/health

# Create alert policy (via Console - easier)
# 1. Go to Monitoring > Alerting
# 2. Create policy for 5xx errors > 10 in 5 minutes
# 3. Email notification to your email
```

---

#### Day 13-14: Bug Fixes

**Fix any bugs found during testing:**

```bash
# Create GitHub issues for each bug
# Fix P0/P1 bugs immediately
# Deploy fixes to staging

# Example flow:
git checkout dev
# Make fixes in code
git add .
git commit -m "fix: resolve payment button issue"
git push origin dev
# CI/CD automatically deploys
```

✅ **Week 2 Complete!** Staging environment fully operational.

**Week 2 Summary:**
- ✅ Backend deployed to Cloud Run
- ✅ Database migrated & seeded
- ✅ Web app deployed to Firebase
- ✅ Mobile apps built (internal testing)
- ✅ Manual testing completed
- ✅ Monitoring configured
- ✅ Major bugs fixed

**Staging URLs:**
```
Backend: https://parkpal-backend-staging-xxxxx-uc.a.run.app
Web: https://parkpal-production.web.app
Mobile: Internal builds via Expo
```

**Cost:** $112/month ongoing

---

## Week 3: Testing & Beta (Days 15-21)

**Goal:** Comprehensive testing + 25 beta testers
**Daily commitment:** 2-3 hours
**Cost this week:** $132 (increased usage)

---

### Day 15-16: Performance & Security Testing

**Time: 2 hours each day**

#### Day 15: Load Testing

```bash
cd ~/Documents/GitHub/ParkPal

# Create load test config
mkdir -p performance-testing
cat > performance-testing/staging-load.yml << 'EOF'
config:
  target: "https://parkpal-backend-staging-xxxxx-uc.a.run.app"
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 30
    - duration: 60
      arrivalRate: 50

scenarios:
  - name: "Search parking"
    flow:
      - get:
          url: "/api/v1/parking/spots?lat=14.5547&lon=121.0244&radius=5000"
      - think: 2
EOF

# Install Artillery
npm install -g artillery

# Run test
artillery run performance-testing/staging-load.yml

# Review results:
# p95 latency: Should be <500ms ✅
# Error rate: Should be <1% ✅
```

---

#### Day 16: Security Testing

**Security checklist:**

```bash
# Test authentication
curl -X POST $STAGING_URL/api/v1/protected-route
# Should return 401 Unauthorized ✅

# Test SQL injection (should be blocked)
curl "$STAGING_URL/api/v1/parking/spots?lat=14'; DROP TABLE users;--"
# Should return validation error ✅

# Test rate limiting
for i in {1..20}; do
  curl -X POST $STAGING_URL/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# After 5-10 attempts, should return 429 Too Many Requests ✅

# Check HTTPS
curl -I https://parkpal-production.web.app
# Should have Strict-Transport-Security header ✅
```

---

### Day 17-18: Beta Tester Recruitment

**Time: 2 hours each day**

#### Recruit 25 beta testers (compress from 50)

**Day 17: Post on social media**

```
Facebook Post:
🚗 Looking for beta testers for ParkPal!

ParkPal is a new parking app for Metro Manila that helps you:
- Find available parking spots
- Book & pay in advance
- Rent out your parking space

Beta testers get:
✅ ₱200 free parking credits
✅ Early access
✅ Help shape the product

Interested? DM me or email: beta@parkpal.com

#ManilaParking #BetaTesting
```

**Create Google Form:**
```
Name:
Email:
Phone:
Location:
Will you be a: [Driver / Host / Both]
```

---

#### Day 18: Onboard Beta Testers

**Send onboarding email:**

```
Subject: Welcome to ParkPal Beta! 🚗

Hi [Name],

You're in! Here's how to get started:

📱 Download:
Web: https://parkpal-production.web.app
iOS: [TestFlight link - send when build completes]
Android: [APK download link]

🔐 Create Account:
Sign up at the web app or mobile app

💰 Beta Credit:
You have ₱200 in credits - book parking for free!

📝 How to Help:
1. Use the app normally
2. Report bugs: bugs@parkpal.com
3. Share feedback: [Google Form]

Questions? Reply to this email.

Happy testing!
```

---

### Day 19-21: Active Beta Testing

**Time: 1 hour per day**

**Daily tasks:**
- Check error logs
- Respond to bug reports
- Monitor usage metrics
- Fix critical bugs

```bash
# Daily monitoring commands
# Check errors
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
  --limit=50

# Check usage
gcloud run services describe parkpal-backend-staging \
  --region=asia-southeast1 \
  --format="value(status.traffic)"
```

**Day 21: Collect feedback**

```bash
# Send survey to all beta testers
# Questions:
# 1. How likely to recommend? (0-10)
# 2. What did you like?
# 3. What needs improvement?
# 4. Any bugs?

# Calculate NPS score
# Target: >50
```

✅ **Week 3 Complete!** Beta testing done.

**Week 3 Summary:**
- ✅ Load testing passed (<500ms p95)
- ✅ Security testing passed
- ✅ 25 beta testers recruited
- ✅ 1 week of active testing
- ✅ Feedback collected
- ✅ Major bugs fixed

**Metrics:**
```
Beta testers: 25
Active users: ~18 (72%)
Bugs found: ~8-12
P0 bugs: 0 ✅
NPS Score: ~55 ✅
```

---

## Week 4: Production Launch (Days 22-28)

**Goal:** Launch to production + app stores
**Daily commitment:** 2-4 hours
**Cost this week:** $327 (staging + production)

---

### Day 22-23: Production Deployment

**Time: 3-4 hours each day**

#### Day 22 Morning: Deploy to Production

```bash
# Create production deployment workflow
# Copy .github/workflows/deploy-staging.yml
# Modify for production

# OR manually deploy:
gcloud run deploy parkpal-backend-production \
  --image gcr.io/parkpal-production/parkpal-backend:staging-latest \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,GCP_PROJECT_ID=parkpal-production,GCS_BUCKET_NAME=parkpal-prod-photos \
  --set-secrets DATABASE_URL=DATABASE_URL_PRODUCTION:latest,JWT_SECRET=JWT_SECRET:latest,REDIS_URL=REDIS_URL:latest,PAYMONGO_SECRET_KEY=PAYMONGO_SECRET_KEY:latest,GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest \
  --add-cloudsql-instances parkpal-production:asia-southeast1:parkpal-db \
  --service-account parkpal-backend@parkpal-production.iam.gserviceaccount.com \
  --min-instances 2 \
  --max-instances 100 \
  --memory 1Gi \
  --cpu 2 \
  --timeout 300 \
  --concurrency 80

# Takes 5-10 minutes
```

**Run production migrations:**

```bash
# Same process as staging
gcloud run jobs create parkpal-migrate-production \
  --image gcr.io/parkpal-production/parkpal-backend:staging-latest \
  --region=asia-southeast1 \
  --set-secrets DATABASE_URL=DATABASE_URL_PRODUCTION:latest \
  --add-cloudsql-instances parkpal-production:asia-southeast1:parkpal-db \
  --service-account parkpal-backend@parkpal-production.iam.gserviceaccount.com \
  --command="npx,prisma,migrate,deploy"

gcloud run jobs execute parkpal-migrate-production \
  --region=asia-southeast1 \
  --wait
```

---

#### Day 22 Afternoon: Configure DNS

**Map custom domain:**

```bash
# Map api.parkpal.com to Cloud Run
gcloud run domain-mappings create \
  --service=parkpal-backend-production \
  --domain=api.parkpal.com \
  --region=asia-southeast1

# Output will show DNS records to add
```

**Add DNS records in your domain registrar:**

```
Type: CNAME
Name: api
Value: ghs.googlehosted.com
TTL: 3600

# Wait 5-30 minutes for DNS propagation

# Test
curl https://api.parkpal.com/health
```

---

#### Day 23: Deploy Production Web & Mobile

**Deploy web to custom domain:**

```bash
cd ~/Documents/GitHub/ParkPal/frontend/web

# Build for production
REACT_APP_API_URL=https://api.parkpal.com \
REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_KEY \
REACT_APP_PAYMONGO_PUBLIC_KEY=pk_live_YOUR_KEY \
npm run build

# Deploy
firebase deploy --only hosting

# Configure custom domain in Firebase Console
# 1. Hosting > Add custom domain
# 2. Enter: parkpal.com
# 3. Add DNS records shown

# DNS records:
Type: A, Name: @, Value: 151.101.1.195
Type: A, Name: @, Value: 151.101.65.195
Type: A, Name: www, Value: 151.101.1.195

# Wait 30-60 minutes for DNS + SSL
```

**Build production mobile apps:**

```bash
cd ~/Documents/GitHub/ParkPal/frontend/mobile

# iOS
eas build --profile production --platform ios
# Takes 30 minutes

# Android
eas build --profile production --platform android
# Takes 20 minutes
```

---

### Day 24-25: App Store Submission

**Time: 3-4 hours each day**

#### Day 24: iOS App Store

```bash
# Prerequisites:
# - Apple Developer account ($99/year)
# - App Store Connect app created

# Create app in App Store Connect:
# 1. Go to https://appstoreconnect.apple.com
# 2. My Apps > + > New App
# 3. Platform: iOS
# 4. Name: ParkPal
# 5. Bundle ID: com.parkpal.app
# 6. SKU: parkpal-ios-2026

# Fill out metadata:
# - Description (see template in previous doc)
# - Keywords
# - Screenshots (take from simulator)
# - Privacy policy: https://parkpal.com/privacy
# - Support URL: https://parkpal.com/support

# Auto-submit with EAS:
eas build --profile production --platform ios --auto-submit

# Or submit manually via EAS:
eas submit --platform ios --latest

# Review time: 24-72 hours
```

---

#### Day 25: Android Play Store

```bash
# Prerequisites:
# - Google Play Console account ($25 one-time)
# - App created in Play Console

# Create app:
# 1. https://play.google.com/console
# 2. Create app
# 3. Fill store listing
# 4. Content rating questionnaire
# 5. Pricing: Free

# Submit:
eas build --profile production --platform android --auto-submit

# Or:
eas submit --platform android --latest

# Start with 10% rollout
# Review time: 24-48 hours
```

---

### Day 26: Production Smoke Tests

**Time: 2-3 hours**

**Critical path testing on production:**

```bash
# Test on production domain only!
open https://parkpal.com

Driver Flow:
- [ ] Sign up (new real email)
- [ ] Verify email
- [ ] Login
- [ ] Search parking
- [ ] Create booking
- [ ] Pay with real card (small amount: ₱100)
- [ ] Verify payment went through
- [ ] Check confirmation email

Host Flow:
- [ ] Sign up as host
- [ ] List parking spot
- [ ] Upload photo
- [ ] Set price
- [ ] Publish

All tests should pass ✅
```

---

### Day 27-28: App Store Launch

**Day 27: Monitor app reviews**

```bash
# iOS app should be approved
# Android app should be approved

# Check App Store Connect
# Check Play Console

# If approved:
# 1. iOS: Automatically live
# 2. Android: Increase rollout to 50%, then 100%
```

**Day 28: Go Live! 🚀**

```bash
# Announce launch!
# Post on social media
# Email beta testers
# Monitor metrics

# You're live! 🎉
```

✅ **Week 4 Complete!** ParkPal is LIVE!

**Production URLs:**
```
API: https://api.parkpal.com
Web: https://parkpal.com
iOS: App Store link
Android: Play Store link
```

---

## Post-Launch: Daily Operations

**Daily (15-30 min):**
- Check error logs
- Monitor uptime
- Respond to support emails
- Review app store ratings

**Weekly (1-2 hours):**
- Review costs vs budget
- Analyze user metrics
- Fix bugs
- Deploy updates

**Monthly (2-3 hours):**
- Review GCP billing
- User satisfaction survey
- Update roadmap

---

## Success! 🎉

**You've completed the 4-week accelerated migration!**

**What you've accomplished:**
- ✅ Set up complete GCP infrastructure
- ✅ Deployed to staging & production
- ✅ Launched on web, iOS, and Android
- ✅ 25 beta testers validated product
- ✅ Now live and accepting real users!

**Current costs:** $175/month (optimized)

**Next steps:**
- Acquire first 100 users
- Iterate based on feedback
- Reach break-even (Month 6)
- Scale! 🚀

---

**You did it! ParkPal is live in production!** 🎊

**Questions or issues?** Reference:
- MIGRATION_PLAN.md (detailed strategy)
- INFRASTRUCTURE_COSTS.md (cost optimization)
- MIGRATION_STEP_BY_STEP.md (8-week version)

---

## Appendix A: Infrastructure Cost Breakdown

### Monthly Cost Summary

| Month | Staging | Production | Total/Month |
|-------|---------|------------|-------------|
| **Month 1** | $112 | $215 | **$327** |
| **Month 3** | $112 | $385 | **$497** |
| **Month 6** | $112 | $685 | **$797** |
| **Month 12** | $112 | $1,240 | **$1,352** |

### Production Cost Breakdown (Month 1)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| **Cloud Run** | 2 min instances, 1GB RAM | $35 |
| **Cloud SQL** | PostgreSQL 16, 2 vCPU, HA | $80 (with CUD) |
| **Redis Cloud** | Essentials 250MB | $5 |
| **Cloud Storage** | Standard, 50GB | $5 |
| **Firebase Hosting** | CDN + SSL | $5 |
| **Cloud Monitoring** | Logs + metrics | $4 |
| **SendGrid (optional)** | 100 emails/day | $0 (free tier) |
| **PayMongo** | Transaction fees | ~$20 |
| **Google Maps API** | 10K requests/month | $0 (free tier) |
| **EAS Builds** | Production plan | $10 |
| **Domain** | .com registration | $1 |
| **TOTAL** | | **$165-215** |

### Cost Optimization Strategies

#### 1. Use Free Tiers (Saves $50-100/month)
- **Gmail SMTP** instead of SendGrid → saves $15/month
- **Google Maps API** free tier (10K requests) → saves $50/month
- **Firebase** free tier → saves $5/month
- **Redis Cloud Essentials** instead of Memorystore → saves $25/month

#### 2. Apply Committed Use Discounts (CUD)
- **Cloud SQL**: 25% off with 1-year CUD → saves $28/month
- **Cloud Run**: 17% off with 1-year CUD → saves $5-10/month
- **Apply at Month 3** when usage is stable

#### 3. Right-Size Resources
- Start with **1 min instance** instead of 2 → saves $17/month
- Use **db-custom-1-3840** initially → saves $26/month
- Upgrade as needed based on metrics

#### 4. Staging Environment Optimization
- **Share Cloud SQL** instance (separate databases) → saves $10/month
- **Use free Redis tier** for staging → saves $5/month
- **Scale down outside business hours** → saves $20/month

### Break-Even Analysis

**Revenue Model:**
- Driver booking fee: 5-7% commission
- Average booking: ₱200 (PHP) = $3.60 USD
- Commission per booking: $0.25

**Break-Even Calculation:**

| Month | Monthly Cost | Bookings Needed | Daily Bookings |
|-------|--------------|-----------------|----------------|
| **Month 1** | $175 (optimized) | 700 | 23/day |
| **Month 3** | $250 | 1,000 | 33/day |
| **Month 6** | $580 | 2,320 | 77/day |
| **Month 12** | $1,860 | 7,440 | 248/day |

**Investment Required (First 5 Months):**
```
Month 1: $175
Month 2: $200
Month 3: $250 (apply CUD here)
Month 4: $350
Month 5: $450
Total: ~$1,425
```

**Projected Timeline to Profitability:**
- **Month 6-7**: Break even at ~100 bookings/day
- **Month 12**: Net positive at ~300 bookings/day

### Alternative: Minimal Cost Configuration ($80/month)

If budget is extremely tight, start with:

| Service | Alternative | Monthly Cost |
|---------|-------------|--------------|
| **Backend** | Railway.app ($5) or Render.com ($7) | $5-7 |
| **Database** | Supabase free tier (500MB) | $0 |
| **Redis** | Upstash free tier (10K commands) | $0 |
| **Storage** | Supabase Storage (1GB) | $0 |
| **Web Hosting** | Vercel/Netlify free tier | $0 |
| **Mobile Builds** | EAS free tier (limited builds) | $0 |
| **Domain** | .com | $1 |
| **Monitoring** | Free tier (LogRocket/Sentry) | $0 |
| **PayMongo** | Transaction fees only | $20 |
| **TOTAL** | | **~$26-28/month** |

**Trade-offs:**
- ⚠️ No high availability
- ⚠️ Limited scalability
- ⚠️ Potential cold starts
- ⚠️ Vendor lock-in with multiple providers
- ✅ Good for MVP validation

---

## Appendix B: Migration Timeline Comparison

### 8-Week Plan vs 4-Week Plan

| Aspect | 8-Week Plan | 4-Week Plan (This Doc) |
|--------|-------------|------------------------|
| **Daily Time** | 1-2 hours | 2-4 hours |
| **Pace** | Leisurely | Intensive |
| **Beta Testers** | 50 users | 25 users |
| **Beta Duration** | 2 weeks | 1 week |
| **Learning Curve** | Gradual | Steep |
| **Stress Level** | Low | Medium-High |
| **Recommended For** | Part-time, learning | Full-time, experienced |

### What If You Need More Time?

**Extend to 6 weeks:**
- Week 1-2: Infrastructure (same)
- Week 3: Staging deployment + testing
- Week 4: Beta testing (2 weeks instead of 1)
- Week 5-6: Production + app stores

**Compress to 3 weeks:**
- Week 1: Infra + staging (Days 1-7)
- Week 2: Testing + beta (Days 8-14)
- Week 3: Production launch (Days 15-21)
- ⚠️ Requires 4-6 hours/day
- ⚠️ Higher risk due to less testing

---

## Appendix C: Troubleshooting Guide

### Common Issues & Solutions

#### Issue 1: Cloud SQL Connection Timeout

**Symptom:**
```
Error: connect ETIMEDOUT
```

**Solutions:**
```bash
# 1. Check Cloud SQL Proxy is running
ps aux | grep cloud-sql-proxy

# 2. Verify connection name
gcloud sql instances describe parkpal-db \
  --format="value(connectionName)"

# 3. Check service account permissions
gcloud projects get-iam-policy parkpal-production \
  --flatten="bindings[].members" \
  --filter="bindings.members:parkpal-backend@*"
```

---

#### Issue 2: GitHub Actions Deployment Fails

**Symptom:**
```
Error: failed to push image gcr.io/...
```

**Solutions:**
```bash
# 1. Verify service account key is in GitHub Secrets
# Go to Settings > Secrets > Actions > GCP_SA_KEY

# 2. Manually authenticate and push
gcloud auth activate-service-account \
  --key-file=~/.gcp/parkpal-sa-key.json
gcloud auth configure-docker

# 3. Check billing is enabled
gcloud billing projects describe parkpal-production
```

---

#### Issue 3: Mobile App Build Fails (EAS)

**Symptom:**
```
Error: No bundle identifier configured
```

**Solutions:**
```bash
# 1. Configure bundle ID in app.json
# iOS: "ios": { "bundleIdentifier": "com.parkpal.app" }
# Android: "android": { "package": "com.parkpal.app" }

# 2. Re-run EAS build
eas build --profile production --platform ios --clear-cache

# 3. Check EAS credentials
eas credentials
```

---

#### Issue 4: Database Migrations Fail in Production

**Symptom:**
```
Error: Migration failed - relation "users" already exists
```

**Solutions:**
```bash
# 1. Check migration status
gcloud run jobs execute parkpal-migrate-production \
  --region=asia-southeast1 \
  --wait

# 2. View job logs
gcloud logging read "resource.type=cloud_run_job" --limit=50

# 3. Manually run migrations with Cloud SQL Proxy
cloud-sql-proxy parkpal-production:asia-southeast1:parkpal-db &
npx prisma migrate status
npx prisma migrate deploy
```

---

#### Issue 5: High Costs in Month 1

**Symptom:**
- Billing alert at 50% ($250 instead of expected $175)

**Solutions:**
```bash
# 1. Check Cloud Run min instances
gcloud run services describe parkpal-backend-production \
  --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])"

# Should be 1-2, not higher

# 2. Check Cloud SQL instance type
gcloud sql instances describe parkpal-db \
  --format="value(settings.tier)"

# Should be db-custom-2-7680 or smaller

# 3. Review actual usage
gcloud billing accounts list
# Go to console.cloud.google.com/billing

# 4. Scale down if over-provisioned
gcloud run services update parkpal-backend-production \
  --min-instances=1 \
  --memory=512Mi
```

---

## Appendix D: Quick Reference Commands

### Daily Operations

```bash
# Check backend health
curl https://api.parkpal.com/health

# View recent errors (last 1 hour)
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR AND timestamp>\"$(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%SZ')\"" --limit=20

# Check Cloud Run metrics
gcloud run services describe parkpal-backend-production \
  --region=asia-southeast1 \
  --format="value(status.traffic)"

# View billing costs (MTD)
gcloud billing accounts list
# Then go to: console.cloud.google.com/billing

# Tail logs in real-time
gcloud run services logs tail parkpal-backend-production \
  --region=asia-southeast1
```

### Emergency Procedures

```bash
# Rollback deployment
gcloud run services update-traffic parkpal-backend-production \
  --to-revisions=parkpal-backend-production-00042-xyz=100 \
  --region=asia-southeast1

# Scale down to save costs
gcloud run services update parkpal-backend-production \
  --min-instances=0 \
  --max-instances=10 \
  --region=asia-southeast1

# Restart service
gcloud run services update parkpal-backend-production \
  --region=asia-southeast1 \
  --update-env-vars=RESTART_TIMESTAMP=$(date +%s)

# Emergency database backup
gcloud sql backups create \
  --instance=parkpal-db \
  --description="Emergency backup $(date)"
```

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

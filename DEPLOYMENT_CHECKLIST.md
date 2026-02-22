# ParkPal Deployment Checklist - Dev Environment

**Date:** February 22, 2026
**Target:** Dev environment (`parkpal-474417`)
**Strategy:** Deploy backend to Cloud Run + Web to Firebase Hosting

---

## ✅ Completed

1. **Production Dockerfile created** - `backend/Dockerfile.production`
   - Multi-stage build for optimization
   - Non-root user for security
   - Health checks configured
   - Port 8080 (Cloud Run standard)

2. **GCP Projects organized:**
   - Dev: `parkpal-474417` (active)
   - Staging: `parkpal-staging` (paused - infrastructure created but unused)
   - Production: `parkpal-production` (paused - no resources)

3. **Existing Secrets in parkpal-474417:**
   - ✅ `JWT_SECRET` (already exists)
   - ✅ `REDIS_URL` (already exists)

---

## 🔴 Required Before Deployment

### Secrets Needed (add to GCP Secret Manager in parkpal-474417)

1. **DATABASE_URL** (required)
   ```bash
   # Format: postgresql://USER:PASSWORD@/DATABASE?host=/cloudsql/CONNECTION_NAME
   # Connection: parkpal-474417:asia-southeast1:parkpal-db
   # Database: parknquik_staging or parknquik_production
   # Need: database user password
   ```

2. **PAYMONGO_SECRET_KEY** (required for payments)
   ```bash
   # Get from: https://dashboard.paymongo.com/
   # Format: sk_test_... (test) or sk_live_... (production)
   ```

3. **PAYMONGO_PUBLIC_KEY** (required for frontend)
   ```bash
   # Get from: https://dashboard.paymongo.com/
   # Format: pk_test_... (test) or pk_live_... (production)
   ```

4. **GOOGLE_MAPS_API_KEY** (required for maps)
   ```bash
   # Get from: https://console.cloud.google.com/apis/credentials
   # Already have this - just need to add to Secret Manager
   ```

---

## 📋 Deployment Steps

### Step 1: Add Missing Secrets

```bash
# Set active project
gcloud config set project parkpal-474417

# DATABASE_URL (replace PASSWORD)
echo -n "postgresql://postgres:YOUR_PASSWORD@/parknquik_staging?host=/cloudsql/parkpal-474417:asia-southeast1:parkpal-db" | \
  gcloud secrets create DATABASE_URL --data-file=-

# PayMongo Secret Key
echo -n "YOUR_PAYMONGO_SECRET_KEY" | \
  gcloud secrets create PAYMONGO_SECRET_KEY --data-file=-

# PayMongo Public Key
echo -n "YOUR_PAYMONGO_PUBLIC_KEY" | \
  gcloud secrets create PAYMONGO_PUBLIC_KEY --data-file=-

# Google Maps API Key
echo -n "YOUR_GOOGLE_MAPS_API_KEY" | \
  gcloud secrets create GOOGLE_MAPS_API_KEY --data-file=-
```

### Step 2: Grant Secret Access to Service Account

```bash
# Get service account email
SA_EMAIL=$(gcloud iam service-accounts list \
  --filter="displayName:parkpal-backend-service" \
  --format="value(email)")

echo "Service Account: $SA_EMAIL"

# Grant access to all secrets
for SECRET in JWT_SECRET REDIS_URL DATABASE_URL PAYMONGO_SECRET_KEY PAYMONGO_PUBLIC_KEY GOOGLE_MAPS_API_KEY
do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/secretmanager.secretAccessor"
done
```

### Step 3: Build and Push Docker Image

```bash
cd /Users/bryanangeloyaneza/Documents/GitHub/ParkPal/backend

# Authenticate Docker with GCP
gcloud auth configure-docker

# Build image
docker build -f Dockerfile.production \
  -t gcr.io/parkpal-474417/parkpal-backend:latest \
  -t gcr.io/parkpal-474417/parkpal-backend:v1.0.0 .

# Push to Google Container Registry
docker push gcr.io/parkpal-474417/parkpal-backend:latest
docker push gcr.io/parkpal-474417/parkpal-backend:v1.0.0
```

### Step 4: Deploy to Cloud Run

```bash
gcloud run deploy parkpal-backend-dev \
  --image gcr.io/parkpal-474417/parkpal-backend:latest \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com \
  --add-cloudsql-instances parkpal-474417:asia-southeast1:parkpal-db \
  --set-env-vars NODE_ENV=development,GCP_PROJECT_ID=parkpal-474417,GCS_BUCKET_NAME=parkpal-prod-photos \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,REDIS_URL=REDIS_URL:latest,PAYMONGO_SECRET_KEY=PAYMONGO_SECRET_KEY:latest,PAYMONGO_PUBLIC_KEY=PAYMONGO_PUBLIC_KEY:latest,GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --concurrency 80 \
  --project parkpal-474417
```

### Step 5: Run Database Migrations

```bash
# Create migration job
gcloud run jobs create parkpal-migrate-dev \
  --image gcr.io/parkpal-474417/parkpal-backend:latest \
  --region asia-southeast1 \
  --set-secrets DATABASE_URL=DATABASE_URL:latest \
  --add-cloudsql-instances parkpal-474417:asia-southeast1:parkpal-db \
  --service-account parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com \
  --command "npx,prisma,migrate,deploy" \
  --project parkpal-474417

# Execute migration
gcloud run jobs execute parkpal-migrate-dev \
  --region asia-southeast1 \
  --wait \
  --project parkpal-474417
```

### Step 6: Setup Firebase Hosting

```bash
cd /Users/bryanangeloyaneza/Documents/GitHub/ParkPal/frontend/web

# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (select parkpal-474417 project)
firebase init

# Select:
# - Hosting
# - Use existing project: parkpal-474417
# - Public directory: build
# - Single-page app: Yes
# - Overwrite index.html: No
```

### Step 7: Deploy Web App

```bash
cd /Users/bryanangeloyaneza/Documents/GitHub/ParkPal/frontend/web

# Get backend URL from Cloud Run
BACKEND_URL=$(gcloud run services describe parkpal-backend-dev \
  --region asia-southeast1 \
  --project parkpal-474417 \
  --format='value(status.url)')

echo "Backend URL: $BACKEND_URL"

# Build with backend URL
REACT_APP_API_URL=$BACKEND_URL \
REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_MAPS_KEY \
REACT_APP_PAYMONGO_PUBLIC_KEY=YOUR_PAYMONGO_PUBLIC_KEY \
npm run build

# Deploy to Firebase
firebase deploy --only hosting --project parkpal-474417
```

### Step 8: Test Deployment

```bash
# Get URLs
BACKEND_URL=$(gcloud run services describe parkpal-backend-dev \
  --region asia-southeast1 \
  --project parkpal-474417 \
  --format='value(status.url)')

echo "Backend: $BACKEND_URL"
echo "Frontend: https://parkpal-474417.web.app"

# Test backend health
curl $BACKEND_URL/health

# Expected response:
# {"status":"ok","database":"up","redis":"up"}

# Open web app
open https://parkpal-474417.web.app
```

---

## 💰 Estimated Monthly Costs (Dev Environment)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| Cloud SQL | parkpal-db (existing) | $80 |
| Redis Cloud | Existing instance | $5 |
| Cloud Run | Min 0, max 10 instances | $0-15 |
| GCS Buckets | Existing buckets | $2 |
| Firebase Hosting | Free tier | $0 |
| Secret Manager | 6 secrets | $0 (free tier) |
| **Total** | | **$87-102/month** |

---

## 🔒 Security Checklist

- ✅ Non-root user in Docker container
- ✅ Secrets stored in GCP Secret Manager (not in code)
- ✅ Service account with least-privilege IAM roles
- ✅ Cloud Run with private Cloud SQL connection
- ✅ HTTPS enforced (Cloud Run default)
- ✅ Health checks configured
- ⏳ Database user password rotation (set up later)
- ⏳ CORS configuration (check backend config)

---

## 🚨 Known Issues / Todo

1. **Database Password**: Need the password for `parknquik_staging` database in parkpal-db
   - Option A: Use existing password (if you have it)
   - Option B: Reset password via Cloud Console
   - Option C: Create new database user

2. **API Keys**: Need to add to Secret Manager:
   - PayMongo keys (from dashboard.paymongo.com)
   - Google Maps API key (already exists somewhere)

3. **Email Service** (optional for MVP):
   - Currently using Nodemailer
   - Need SMTP credentials or use Gmail

---

## 📝 Next Steps

**Immediate (blocking deployment):**
1. Get database password
2. Get PayMongo keys
3. Get Google Maps API key
4. Add secrets to Secret Manager

**After first deployment:**
5. Test all endpoints
6. Verify database connectivity
7. Test Redis caching
8. Test payment flow
9. Monitor logs for errors

**Future improvements:**
10. Set up CI/CD (GitHub Actions)
11. Add monitoring/alerting
12. Set up custom domain
13. Add staging/production environments

---

**Status:** 🟡 Ready to deploy (needs API keys)
**Next:** Add secrets to GCP Secret Manager, then deploy!

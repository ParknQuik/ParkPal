# Web Frontend Deployment Setup

**Last Updated:** March 10, 2026
**Status:** Ready for deployment
**Platform:** GCP Cloud Run
**CI/CD:** GitHub Actions

---

## Prerequisites

1. **GCP Project:** parkpal-474417
2. **Service Account:** parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com
3. **Docker Registry:** gcr.io/parkpal-474417
4. **GitHub Repository:** ParknQuik/ParkPal

---

## Required GitHub Secrets

### GCP Authentication
- **GCP_SA_KEY** - Service account JSON key (already configured for backend)
  - Location: `~/.gcp/parkpal-sa-key.json` on local machine
  - Already exists in GitHub repository secrets

### Environment Variables

#### VITE_API_BASE_URL
- **Development:** `https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api`
- **Staging:** `https://parkpal-backend-staging-<hash>.a.run.app/api` (when created)
- **Production:** `https://api.parkpal.com/api` (when configured)

#### VITE_GOOGLE_MAPS_API_KEY
- Get from GCP Secret Manager: `GOOGLE_MAPS_API_KEY`
- Command:
  ```bash
  gcloud secrets versions access latest --secret=GOOGLE_MAPS_API_KEY --project=parkpal-474417
  ```

#### VITE_PAYMONGO_PUBLIC_KEY
- Get from GCP Secret Manager: `PAYMONGO_PUBLIC_KEY`
- Command:
  ```bash
  gcloud secrets versions access latest --secret=PAYMONGO_PUBLIC_KEY --project=parkpal-474417
  ```

---

## Setup Steps

### Step 1: Verify GCP Service Account Permissions

The service account needs these permissions:
- `roles/run.admin` - Deploy Cloud Run services
- `roles/iam.serviceAccountUser` - Act as service account
- `roles/artifactregistry.writer` - Push Docker images

Verify:
```bash
gcloud projects get-iam-policy parkpal-474417 \
  --flatten="bindings[].members" \
  --filter="bindings.members:parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

If missing, add permissions:
```bash
gcloud projects add-iam-policy-binding parkpal-474417 \
  --member="serviceAccount:parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com" \
  --role="roles/run.admin"
```

### Step 2: Get API Keys from GCP Secret Manager

```bash
# Google Maps API Key
MAPS_KEY=$(gcloud secrets versions access latest --secret=GOOGLE_MAPS_API_KEY --project=parkpal-474417)
echo "VITE_GOOGLE_MAPS_API_KEY: $MAPS_KEY"

# PayMongo Public Key
PAYMONGO_KEY=$(gcloud secrets versions access latest --secret=PAYMONGO_PUBLIC_KEY --project=parkpal-474417)
echo "VITE_PAYMONGO_PUBLIC_KEY: $PAYMONGO_KEY"
```

### Step 3: Add GitHub Secrets

Go to: https://github.com/ParknQuik/ParkPal/settings/secrets/actions

Add these secrets:
1. **VITE_API_BASE_URL** = `https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api`
2. **VITE_GOOGLE_MAPS_API_KEY** = (output from Step 2)
3. **VITE_PAYMONGO_PUBLIC_KEY** = (output from Step 2)

### Step 4: Test Deployment Workflow

Push to `dev` branch to trigger deployment:
```bash
git checkout dev
git push origin dev
```

Or manually trigger:
```bash
gh workflow run deploy-web.yml -f environment=development
```

### Step 5: Verify Deployment

After deployment completes, check:
```bash
# Get service URL
gcloud run services describe parkpal-web-dev \
  --region=asia-southeast1 \
  --project=parkpal-474417 \
  --format="value(status.url)"

# Test health endpoint
curl https://parkpal-web-dev-<hash>.a.run.app/health

# Expected output:
# {"status":"healthy","service":"parkpal-web","timestamp":"..."}
```

---

## Deployment Environments

### Development (dev branch)
- **Service:** parkpal-web-dev
- **URL:** https://parkpal-web-dev-<hash>.a.run.app
- **Backend:** https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app
- **Min instances:** 0 (cost optimization)
- **Max instances:** 5

### Staging (qa branch)
- **Service:** parkpal-web-staging
- **URL:** https://parkpal-web-staging-<hash>.a.run.app
- **Backend:** TBD (when staging backend created)
- **Min instances:** 0
- **Max instances:** 5

### Production (main branch)
- **Service:** parkpal-web-prod
- **URL:** https://parkpal-web-prod-<hash>.a.run.app (later: https://app.parkpal.com)
- **Backend:** https://api.parkpal.com
- **Min instances:** 1 (always warm)
- **Max instances:** 10

---

## Dockerfile Details

The web frontend uses a **multi-stage build**:

### Stage 1: Build (Node 18 Alpine)
- Install dependencies (`npm ci`)
- Build Vite application with environment variables
- Output to `/app/dist`

### Stage 2: Serve (Nginx Alpine)
- Copy built assets to `/usr/share/nginx/html`
- Serve on port 80
- Health check on `/health`

### Build Arguments
All `VITE_*` environment variables are passed as build arguments:
```dockerfile
--build-arg VITE_API_BASE_URL=https://...
--build-arg VITE_GOOGLE_MAPS_API_KEY=...
--build-arg VITE_PAYMONGO_PUBLIC_KEY=...
--build-arg VITE_APP_ENV=development
```

---

## CI/CD Workflow

### Triggers
- **Push to dev:** Deploy to development
- **Push to qa:** Deploy to staging
- **Push to main:** Deploy to production
- **Manual:** `gh workflow run deploy-web.yml -f environment=<env>`

### Steps
1. **Setup:** Determine environment (dev/staging/prod)
2. **Build & Test:**
   - Install dependencies
   - Type check (TypeScript)
   - Run tests
   - Build application
3. **Deploy:**
   - Authenticate to GCP
   - Build Docker image
   - Push to GCR
   - Deploy to Cloud Run
   - Health check

### Success Criteria
- ✅ Type check passes
- ✅ Tests pass
- ✅ Build completes
- ✅ Docker image pushed
- ✅ Cloud Run deployment succeeds
- ✅ Health check returns 200

---

## Troubleshooting

### Build Fails
```bash
# Check build logs locally
cd frontend/web
npm run build

# Check if environment variables are set
npm run build -- --debug
```

### Deployment Fails
```bash
# Check Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=parkpal-web-dev" \
  --limit 50 \
  --project parkpal-474417 \
  --format="table(timestamp,severity,textPayload)"
```

### Health Check Fails
```bash
# Get service URL
URL=$(gcloud run services describe parkpal-web-dev \
  --region=asia-southeast1 \
  --project=parkpal-474417 \
  --format="value(status.url)")

# Test health endpoint
curl -v $URL/health

# Test root endpoint
curl -v $URL/
```

### Permission Denied
```bash
# Verify service account has correct roles
gcloud projects get-iam-policy parkpal-474417 \
  --flatten="bindings[].members" \
  --filter="bindings.members:parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com"
```

---

## Cost Estimates

### Development Environment
- **Cloud Run:** ~$0-5/month (min instances: 0)
- **Container Registry:** ~$0.10/GB/month
- **Total:** ~$0-5/month

### Production Environment
- **Cloud Run:** ~$15-30/month (min instances: 1)
- **Container Registry:** ~$0.20/GB/month
- **Cloud CDN (future):** ~$5-10/month
- **Total:** ~$20-40/month

---

## Next Steps

1. **Deploy to Development**
   - Add GitHub secrets
   - Push to dev branch
   - Verify deployment

2. **Test End-to-End**
   - Test all user flows
   - Verify API integration
   - Check payment flows

3. **Deploy to Staging**
   - Create staging backend (if needed)
   - Update VITE_API_BASE_URL
   - Deploy to qa branch

4. **Deploy to Production**
   - Setup custom domain (app.parkpal.com)
   - Configure Cloud CDN
   - Deploy to main branch

---

**Status:** Ready for deployment ✅
**Next Action:** Add GitHub secrets and deploy to dev
**Owner:** Engineering Team
**Deployment Guide:** This file

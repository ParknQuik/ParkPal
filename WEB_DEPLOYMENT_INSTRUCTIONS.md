# Web Frontend Deployment - Quick Start Guide

**Created:** March 10, 2026
**Status:** Ready to deploy
**Time Required:** 15-20 minutes

---

## What We're Deploying

- **Frontend:** React + Vite web dashboard
- **Platform:** GCP Cloud Run
- **Environment:** Development (parkpal-web-dev)
- **Automation:** GitHub Actions workflow

---

## Step 1: Get API Keys from GCP (2 minutes)

Run these commands to get the required API keys:

```bash
# 1. Google Maps API Key
gcloud secrets versions access latest --secret=GOOGLE_MAPS_API_KEY --project=parkpal-474417

# 2. PayMongo Public Key
gcloud secrets versions access latest --secret=PAYMONGO_PUBLIC_KEY --project=parkpal-474417
```

**Copy these values - you'll need them for Step 2.**

---

## Step 2: Add GitHub Secrets (5 minutes)

Go to: https://github.com/ParknQuik/ParkPal/settings/secrets/actions

Click "New repository secret" and add these 3 secrets:

### Secret 1: VITE_API_BASE_URL
- **Name:** `VITE_API_BASE_URL`
- **Value:** `https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api`

### Secret 2: VITE_GOOGLE_MAPS_API_KEY
- **Name:** `VITE_GOOGLE_MAPS_API_KEY`
- **Value:** (paste output from Step 1, command 1)

### Secret 3: VITE_PAYMONGO_PUBLIC_KEY
- **Name:** `VITE_PAYMONGO_PUBLIC_KEY`
- **Value:** (paste output from Step 1, command 2)

---

## Step 3: Deploy Web Frontend (10 minutes)

### Option A: Auto-deploy (push to dev branch)

The workflow is already created. Just push to dev branch:

```bash
git checkout dev
git pull origin dev
# Make sure you're on the latest commit with the new workflow
git push origin dev
```

### Option B: Manual deploy

Trigger manually via GitHub CLI:

```bash
gh workflow run deploy-web.yml -f environment=development
```

Or via GitHub UI:
1. Go to: https://github.com/ParknQuik/ParkPal/actions/workflows/deploy-web.yml
2. Click "Run workflow"
3. Select branch: `dev`
4. Select environment: `development`
5. Click "Run workflow"

---

## Step 4: Monitor Deployment (5-10 minutes)

### Watch GitHub Actions

```bash
gh run watch
```

Or view in browser:
https://github.com/ParknQuik/ParkPal/actions

### Expected Steps:
1. ✅ Setup - Determine environment
2. ✅ Build & Test - Install, type-check, test, build
3. ✅ Deploy - Docker build, push to GCR, deploy to Cloud Run
4. ✅ Health Check - Verify service is healthy

---

## Step 5: Verify Deployment (2 minutes)

Once deployment completes:

```bash
# Get service URL
gcloud run services describe parkpal-web-dev \
  --region=asia-southeast1 \
  --project=parkpal-474417 \
  --format="value(status.url)"

# Test health endpoint
curl $(gcloud run services describe parkpal-web-dev \
  --region=asia-southeast1 \
  --project=parkpal-474417 \
  --format="value(status.url)")/health

# Expected output:
# {"status":"healthy","service":"parkpal-web","timestamp":"..."}
```

Open the URL in your browser to see the web dashboard!

---

## What's Been Created

### Files Added
1. **`.github/workflows/deploy-web.yml`** - GitHub Actions workflow
   - Builds Docker image
   - Pushes to GCR
   - Deploys to Cloud Run
   - Runs health checks

2. **`frontend/web/DEPLOYMENT_SETUP.md`** - Comprehensive deployment guide
   - Prerequisites
   - Setup steps
   - Troubleshooting
   - Cost estimates

### GCP Resources (will be created on first deploy)
- **Cloud Run Service:** parkpal-web-dev
  - Region: asia-southeast1
  - Min instances: 0 (cost optimization)
  - Max instances: 5
  - Memory: 512Mi
  - CPU: 1

- **Container Images:** gcr.io/parkpal-474417/parkpal-web-dev
  - Latest tag
  - Git SHA tag

---

## Troubleshooting

### If GitHub Actions fails

**1. Permission Error**
```bash
# Add Cloud Run admin role to service account
gcloud projects add-iam-policy-binding parkpal-474417 \
  --member="serviceAccount:parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com" \
  --role="roles/run.admin" \
  --condition=None
```

**2. Secret Not Found**
- Double-check GitHub secrets are added correctly
- Names must match exactly (case-sensitive)
- No extra spaces in values

**3. Build Fails**
```bash
# Test build locally
cd frontend/web
npm ci
npm run build
```

### If deployment succeeds but health check fails

```bash
# Check Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=parkpal-web-dev" \
  --limit 20 \
  --project parkpal-474417 \
  --format="table(timestamp,severity,textPayload)"
```

---

## Next Steps After Deployment

1. **Test the Web Dashboard**
   - Open the Cloud Run URL
   - Test user registration
   - Test parking spot search
   - Test payment integration

2. **Monitor Performance**
   - Check response times
   - Monitor error rates
   - Check Cloud Run metrics

3. **Deploy to Staging** (when ready)
   - Create staging backend
   - Push to `qa` branch
   - Test full staging environment

4. **Deploy to Production** (when ready)
   - Setup custom domain (app.parkpal.com)
   - Push to `main` branch
   - Configure Cloud CDN

---

## Summary Checklist

- [ ] Get API keys from GCP Secret Manager (Step 1)
- [ ] Add 3 GitHub secrets (Step 2)
- [ ] Deploy via GitHub Actions (Step 3)
- [ ] Monitor deployment (Step 4)
- [ ] Verify health check (Step 5)
- [ ] Test web dashboard in browser

**Estimated Total Time:** 15-20 minutes

---

**Status:** Ready to deploy ✅
**Workflow:** `.github/workflows/deploy-web.yml`
**Documentation:** `frontend/web/DEPLOYMENT_SETUP.md`
**Next Action:** Run Step 1 to get API keys

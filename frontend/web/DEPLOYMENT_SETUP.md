# Web Frontend Deployment Setup

**Last Updated:** November 14, 2026
**Status:** Configuration reference; live production readiness is unverified
**Platform:** GCP Cloud Run

> This document is a deployment checklist, not evidence that the listed services,
> secrets, domains, or workflows are currently configured. Verify each item
> against the active GCP project and GitHub environment before a release.

## Public domain assumption

The current customer-facing canonical host assumption is `https://parkpal.com`.
The production web service, custom-domain mapping, DNS, TLS certificate, and
backend API host have not been verified as configured. Keep preview and
development URLs out of canonical metadata. Do not treat this checklist as a
deployment approval.

## Transport security and browser keys

Cloud Run terminates HTTPS before forwarding a request to the container. The
container's Nginx configuration redirects requests that Cloud Run marks as
forwarded HTTP, and returns HSTS on responses. Keep the public Cloud Run HTTPS
endpoint enabled; do not expose the container directly outside Cloud Run.

Values prefixed with `VITE_` are compiled into browser JavaScript and are
visible to every visitor. The Google Maps key is a browser key: restrict it by
the deployed website's HTTP referrer and by the APIs it can call. Never put
payment-provider secret keys, service-account credentials, or other private
credentials in a `VITE_` variable. Payment operations must continue through the
backend API.

## Web social sign-in setup gate

The login and registration tabs always show Google, Apple, and Facebook. A
disabled option with a setup message means that its public Vite settings are
missing. A temporary unavailable message means the provider SDK did not load or
initialize. The Google option uses Google's official button after GIS loads.
These settings are browser-visible identifiers, not provider secrets. Keep
Apple and Facebook disabled until their real settings and provider-console
setup are supplied, and do not deploy placeholder values. Enable each provider
in an environment only after its real sign-in flow has been tested end to end.

| Provider | Web build settings | Backend settings | Provider console setup |
| --- | --- | --- | --- |
| Google | `VITE_GOOGLE_CLIENT_ID` | `GOOGLE_WEB_CLIENT_ID` (same web OAuth client ID; existing `GOOGLE_CLIENT_ID` remains for mobile) | Register the exact web origin in the OAuth client. |
| Apple | `VITE_APPLE_SERVICES_ID`, `VITE_APPLE_REDIRECT_URI` | `APPLE_WEB_CLIENT_ID` (same Services ID) | Associate a Services ID with the app, register each web domain and exact HTTPS return URL. The return URL must match the browser build. |
| Facebook | `VITE_FACEBOOK_APP_ID` | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Configure Facebook Login for Web, allowed domains and valid OAuth redirect URLs in the Meta app. |

For local Google testing, set `VITE_GOOGLE_CLIENT_ID` to the existing backend
Google web OAuth client ID in the ignored `frontend/web/.env.local`, restart
Vite, and register the exact browser origin (including its port) as an
Authorized JavaScript origin for that OAuth client. If Google rejects the
origin, remove the local setting until it is registered; the login page will
keep Google visible but disabled. No secret belongs in `.env.local` under a
`VITE_` name.

Supply the four `VITE_*` values through the web deployment workflow's GitHub
secrets and Docker build arguments for each environment. Supply backend IDs and
secrets only to the backend deployment. For the backend Cloud Run workflow,
`GOOGLE_CLIENT_ID`, `GOOGLE_WEB_CLIENT_ID`, `APPLE_WEB_CLIENT_ID`, and
`FACEBOOK_APP_ID` are GitHub environment variables. Keep `GOOGLE_CLIENT_ID`
configured for mobile Google login across backend redeploys; the optional
`GOOGLE_WEB_CLIENT_ID` accepts a separate web audience.
`FACEBOOK_APP_SECRET_NAME` is the optional GCP Secret
Manager secret name used to inject `FACEBOOK_APP_SECRET`. Never put that secret
in a `VITE_*` variable.

After configuring an environment, verify each provider on its actual HTTPS
origin and return URL: complete registration, repeat sign-in, cancel the popup,
deny email permission where supported, and try an email already registered by
another method. A mocked browser test does not complete this release gate.

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
1. **VITE_API_BASE_URL** = `https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api/v1`
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

The service names and environment values below are historical configuration
references. Confirm the live Cloud Run service, region, API URL, min/max
instances, and domain mapping before using them.

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

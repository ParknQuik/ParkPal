# GCP Secret Manager

**Status:** ✅ Operational
**Coverage:** 8/8 secrets managed (100%)
**Mode:** Dual — GCP Secret Manager in production, `.env` fallback for local dev

---

## Architecture

```
Application Code (controllers, services, middleware)
  ↓
secretManager.getSecret('secret-name')
  ↓
┌─────────────────────────────────────────────┐
│  USE_SECRET_MANAGER=true  → GCP Secret Manager │
│  USE_SECRET_MANAGER=false → process.env fallback│
└─────────────────────────────────────────────┘
```

**Benefits:**
- API keys never stored in code or committed to git
- Easy rotation without redeployment
- Audit logging of all secret access
- Consistent secrets across all Cloud Run instances

---

## Secrets Managed

| Secret Name | Env Var Fallback | Used By |
|-------------|-----------------|---------|
| `jwt-secret` | `JWT_SECRET` | Auth service, WebSocket |
| `qr-secret` | `QR_SECRET` | QR code signing/verification |
| `redis-url` | `REDIS_URL` | Redis connection |
| `weather-api-key` | `WEATHER_API_KEY` | Alerts controller |
| `paymongo-secret-key` | `PAYMONGO_SECRET_KEY` | Payments service |
| `paymongo-public-key` | `PAYMONGO_PUBLIC_KEY` | Payments service |
| `paymongo-webhook-secret` | `PAYMONGO_WEBHOOK_SECRET` | Webhook verification |
| `google-maps-api-key` | `MAPS_API_KEY` | Config controller → mobile app |

---

## Setup (First Time)

### 1. Enable Secret Manager API

```bash
gcloud services enable secretmanager.googleapis.com --project=YOUR_PROJECT_ID
```

### 2. Create Service Account

```bash
gcloud iam service-accounts create parkpal-backend-service \
  --display-name="ParkPal Backend Service"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:parkpal-backend-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Create and Download Key

```bash
gcloud iam service-accounts keys create parkpal-service-account-key.json \
  --iam-account=parkpal-backend-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

Store securely — this file grants GCP access. Add to `.gitignore`.

### 4. Upload Secrets

**Option A — Script (recommended):**
```bash
cd backend
node scripts/upload-secrets.js
```

**Option B — Manual upload:**
```bash
echo -n "your-secret-value" | gcloud secrets create SECRET_NAME \
  --data-file=- --replication-policy="automatic"
```

**Option C — Add new version to existing secret:**
```bash
echo -n "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-
```

### 5. Configure Backend

```bash
# backend/.env
USE_SECRET_MANAGER=true
GCP_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/parkpal-service-account-key.json
```

---

## Local Development (No Secret Manager)

```bash
# backend/.env
USE_SECRET_MANAGER=false
JWT_SECRET=local_dev_secret
MAPS_API_KEY=AIzaSy...
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_PUBLIC_KEY=pk_test_...
```

The backend automatically uses env vars as fallback when `USE_SECRET_MANAGER=false`.

---

## Usage in Code

```javascript
const secretManager = require('./config/secretManager');

// Single secret
const apiKey = await secretManager.getSecret('google-maps-api-key');

// Multiple secrets
const secrets = await secretManager.getSecrets(['jwt-secret', 'paymongo-secret-key']);
```

---

## Mobile App: Fetching Google Maps Key

The mobile app never has the Maps API key hardcoded. It fetches it from the backend:

```typescript
import mapsConfig from './services/mapsConfig';

const apiKey = await mapsConfig.getApiKey(); // cached 24 hours
await mapsConfig.refreshApiKey();           // force refresh
await mapsConfig.clearCache();              // clear on logout
```

Backend endpoint: `GET /api/v1/config/maps-api-key` (requires auth)

---

## Rotating a Secret

```bash
# Add new version
echo -n "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Restart backend (picks up latest version automatically)
# Then disable old version
gcloud secrets versions disable 1 --secret="SECRET_NAME"
```

Rotate every 90 days. For PayMongo keys, revoke old key in PayMongo dashboard after disabling.

---

## Verifying Setup

```bash
# List all secrets
gcloud secrets list

# Verify a specific secret exists
gcloud secrets describe paymongo-secret-key

# Check backend startup logs for:
# ✅ PayMongo service initialized with Secret Manager
# ✅ Secret Manager client initialized
```

---

## Cost

- Secret versions: $0.06/active version/month
- Access operations: $0.03/10,000 operations
- **Estimated for ParkPal: ~$0.60/month** (8 secrets + ~100k fetches)

---

## Troubleshooting

**"Secret Manager client not initialized"** — Set `USE_SECRET_MANAGER=true` and `GCP_PROJECT_ID` in `.env`.

**"Failed to retrieve secret"** — Check service account has `secretmanager.secretAccessor` role. Verify secret exists in GCP Console. Check `GOOGLE_APPLICATION_CREDENTIALS` path.

**"GOOGLE_APPLICATION_CREDENTIALS not set"** — `export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json` or set in `.env`.

**Mobile: "Failed to get Google Maps API key"** — Backend must be running and reachable. User must be authenticated. Backend must have access to Secret Manager or `MAPS_API_KEY` env var set.

---

## Security Rules

**Do:**
- Use Secret Manager in all deployed environments
- Restrict service account to minimum required permissions
- Enable GCP audit logs for secret access
- Use different secrets per environment (dev/staging/prod)

**Don't:**
- Commit service account key JSON to git
- Store API keys in mobile app code or config files
- Share service account keys via email or chat
- Use the same keys across environments

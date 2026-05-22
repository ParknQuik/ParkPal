# API Key Management Guide - ParkPal

**Last Updated:** December 16, 2025
**System:** Dual-mode (Local .env + GCP Secret Manager)

---

## 🔑 How API Keys Work in ParkPal

ParkPal uses a **dual-mode system** for API key management:

1. **Development:** Local `.env` file (fast, simple)
2. **Production:** GCP Secret Manager (secure, centralized)

The system **automatically switches** based on the `USE_SECRET_MANAGER` environment variable.

---

## 🏗️ Architecture Overview

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Code                          │
│  (controllers, services)                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              secretManager.getSecret()                       │
│              (config/secretManager.js)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │ Check:  │
                    │ USE_    │
                    │ SECRET_ │
                    │ MANAGER │
                    └────┬────┘
                         │
            ┌────────────┴────────────┐
            │                         │
    USE_SECRET_MANAGER=false    USE_SECRET_MANAGER=true
            │                         │
            ▼                         ▼
    ┌──────────────┐          ┌─────────────────┐
    │   .env file  │          │  GCP Secret     │
    │   (local)    │          │  Manager        │
    │              │          │  (production)   │
    └──────────────┘          └─────────────────┘
```

---

## 📍 Current Implementation Status

### ✅ Using Secret Manager (Recommended)

| API Key | Controller/Service | Retrieval Method | Status |
|---------|-------------------|------------------|--------|
| **PayMongo Secret** | `services/paymongo.js` | `secretManager.getSecret('paymongo-secret-key')` | ✅ Implemented |
| **PayMongo Public** | `services/paymongo.js` | `secretManager.getSecret('paymongo-public-key')` | ✅ Implemented |
| **PayMongo Webhook** | `services/paymongo.js` | `secretManager.getSecret('paymongo-webhook-secret')` | ✅ Implemented |
| **Google Maps** | `controllers/configController.js` | `secretManager.getSecret('google-maps-api-key')` | ✅ Implemented |

### ⚠️ Using Direct `process.env` (Legacy)

| API Key | Controller | Retrieval Method | Needs Migration |
|---------|-----------|------------------|-----------------|
| **Weather API** | `controllers/alertsController.js` | `process.env.WEATHER_API_KEY` | ✅ No (optional feature) |
| **JWT Secret** | `services/auth.js` | `process.env.JWT_SECRET` | ⚠️ Yes (P0) |
| **Database URL** | `index.js`, `prisma` | `process.env.DATABASE_URL` | ⚠️ Yes (P1) |

---

## 🔧 How to Retrieve API Keys

### Method 1: Using Secret Manager (Recommended)

**When to use:** Production, staging, or any secure environment

**Example:**
```javascript
const secretManager = require('../config/secretManager');

async function myController(req, res) {
  try {
    // Get API key from GCP Secret Manager (or fallback to .env)
    const apiKey = await secretManager.getSecret('my-api-key-name');

    // Check if key exists
    if (!apiKey || apiKey.startsWith('test_')) {
      return res.status(500).json({
        error: 'API key not configured'
      });
    }

    // Use the key
    const result = await externalApi.call(apiKey);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

**Secret Names in GCP:**
- `paymongo-secret-key` → `PAYMONGO_SECRET_KEY`
- `paymongo-public-key` → `PAYMONGO_PUBLIC_KEY`
- `google-maps-api-key` → `GOOGLE_MAPS_API_KEY`

**How it works:**
1. Checks `USE_SECRET_MANAGER` env var
2. If `true`: Fetches from GCP Secret Manager
3. If `false`: Falls back to `process.env.MY_API_KEY_NAME`
4. Returns the value

### Method 2: Direct Environment Variables (Development)

**When to use:** Local development only

**Example:**
```javascript
async function myController(req, res) {
  const apiKey = process.env.MY_API_KEY;

  // Always validate!
  if (!apiKey || apiKey.startsWith('test_')) {
    return res.json({
      data: null,
      message: 'API key not configured'
    });
  }

  // Use the key...
}
```

---

## 📝 How Secret Manager Works

### 1. Initialization (Automatic)

**File:** `backend/index.js`
```javascript
const secretManager = require('./config/secretManager');
secretManager.initialize(); // Called on server start
```

### 2. Configuration

**File:** `.env`
```bash
# Enable/disable Secret Manager
USE_SECRET_MANAGER=false  # Development
USE_SECRET_MANAGER=true   # Production

# GCP Configuration
GCP_PROJECT_ID=parkpal-production
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### 3. Retrieval Logic

**File:** `config/secretManager.js`
```javascript
async getSecret(secretName, version = 'latest') {
  if (!this.isEnabled) {
    // MODE 1: Local .env file
    const envKey = secretName.toUpperCase().replace(/-/g, '_');
    return process.env[envKey] || '';
  }

  // MODE 2: GCP Secret Manager
  const name = `projects/${this.projectId}/secrets/${secretName}/versions/${version}`;
  const [response] = await this.client.accessSecretVersion({ name });
  return response.payload.data.toString('utf8');
}
```

---

## 🎯 Best Practices

### ✅ DO

1. **Always use `secretManager.getSecret()` for new code**
   ```javascript
   ✅ const key = await secretManager.getSecret('my-api-key');
   ```

2. **Always validate API keys before use**
   ```javascript
   ✅ if (!key || key.startsWith('test_') || key === 'placeholder') {
        return gracefulFallback();
      }
   ```

3. **Add timeout to external API calls**
   ```javascript
   ✅ axios.get(url, { timeout: 5000 })
   ```

4. **Use consistent naming**
   - GCP Secret: `my-api-key` (kebab-case)
   - Env Var: `MY_API_KEY` (SCREAMING_SNAKE_CASE)

5. **Graceful degradation**
   ```javascript
   ✅ if (!apiKey) {
        return res.json({ data: null, message: 'Feature disabled' });
      }
   ```

### ❌ DON'T

1. **Don't use `process.env` directly for sensitive keys**
   ```javascript
   ❌ const key = process.env.PAYMONGO_SECRET_KEY; // Legacy pattern
   ✅ const key = await secretManager.getSecret('paymongo-secret-key');
   ```

2. **Don't skip validation**
   ```javascript
   ❌ const key = process.env.API_KEY;
      makeApiCall(key); // Could be undefined or 'test_placeholder'!
   ```

3. **Don't make external calls without checking placeholders**
   ```javascript
   ❌ if (!apiKey) return fallback();
      // Still makes call with 'test_api_key'!

   ✅ if (!apiKey || apiKey.startsWith('test_')) {
        return fallback();
      }
   ```

4. **Don't forget timeouts**
   ```javascript
   ❌ axios.get(url) // Could hang forever
   ✅ axios.get(url, { timeout: 5000 })
   ```

---

## 🔄 Migration Guide

### Migrating from `process.env` to `secretManager`

**Before:**
```javascript
const jwt = require('jsonwebtoken');

function generateToken(userId) {
  const secret = process.env.JWT_SECRET;
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
}
```

**After:**
```javascript
const jwt = require('jsonwebtoken');
const secretManager = require('../config/secretManager');

async function generateToken(userId) {
  const secret = await secretManager.getSecret('jwt-secret');

  if (!secret || secret === 'test_jwt_secret_for_development_only_do_not_use_in_production_12345678') {
    throw new Error('JWT secret not properly configured');
  }

  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
}
```

**Steps:**
1. ✅ Replace `process.env.XXX` with `await secretManager.getSecret('xxx')`
2. ✅ Convert function to `async`
3. ✅ Add validation for placeholder values
4. ✅ Add secret to GCP Secret Manager (production)
5. ✅ Test in both modes (`USE_SECRET_MANAGER=false` and `true`)

---

## 🏭 Production Setup

### Step 1: Create Secrets in GCP

```bash
# Set your project
gcloud config set project parkpal-production

# Create secrets
gcloud secrets create paymongo-secret-key --replication-policy="automatic"
gcloud secrets create paymongo-public-key --replication-policy="automatic"
gcloud secrets create paymongo-webhook-secret --replication-policy="automatic"
gcloud secrets create google-maps-api-key --replication-policy="automatic"
gcloud secrets create jwt-secret --replication-policy="automatic"
gcloud secrets create database-url --replication-policy="automatic"

# Add values
echo -n "sk_live_your_real_key" | gcloud secrets versions add paymongo-secret-key --data-file=-
echo -n "pk_live_your_real_key" | gcloud secrets versions add paymongo-public-key --data-file=-
echo -n "whsec_your_webhook_secret" | gcloud secrets versions add paymongo-webhook-secret --data-file=-
echo -n "your_google_maps_api_key" | gcloud secrets versions add google-maps-api-key --data-file=-
echo -n "your_production_jwt_secret_128_chars_minimum" | gcloud secrets versions add jwt-secret --data-file=-
echo -n "postgresql://user:pass@host:5432/db" | gcloud secrets versions add database-url --data-file=-
```

### Step 2: Grant Access to Service Account

```bash
# Create service account
gcloud iam service-accounts create parkpal-backend \
  --display-name="ParkPal Backend Service Account"

# Grant Secret Manager access
gcloud projects add-iam-policy-binding parkpal-production \
  --member="serviceAccount:parkpal-backend@parkpal-production.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Download service account key
gcloud iam service-accounts keys create service-account-key.json \
  --iam-account=parkpal-backend@parkpal-production.iam.gserviceaccount.com
```

### Step 3: Configure Production Environment

```bash
# Production .env
USE_SECRET_MANAGER=true
GCP_PROJECT_ID=parkpal-production
GOOGLE_APPLICATION_CREDENTIALS=/app/config/service-account-key.json
NODE_ENV=production
```

### Step 4: Deploy & Verify

```bash
# Deploy to Cloud Run / GKE / etc.
# ...

# Test secret retrieval
curl https://api.parkpal.com/api/v1/config/maps
# Should return: { "apiKey": "your_real_google_maps_key" }
```

---

## 🧪 Testing Both Modes

### Test 1: Local Mode (Development)

```bash
# .env
USE_SECRET_MANAGER=false
PAYMONGO_SECRET_KEY=sk_test_abc123
GOOGLE_MAPS_API_KEY=test_google_key

# Start server
npm run dev

# Test
curl http://localhost:3001/api/v1/config/maps
# Returns: { "apiKey": "test_google_key" }
```

### Test 2: Secret Manager Mode (Production Simulation)

```bash
# .env
USE_SECRET_MANAGER=true
GCP_PROJECT_ID=parkpal-production
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json

# Start server
npm run dev

# Test
curl http://localhost:3001/api/v1/config/maps
# Returns: { "apiKey": "real_key_from_gcp" }
```

---

## 📊 Current API Keys

| Key | Development (.env) | Production (GCP) | Status |
|-----|-------------------|------------------|--------|
| PayMongo Secret | `sk_test_L8Cj...` | `paymongo-secret-key` | ✅ Ready |
| PayMongo Public | `pk_test_ACSg...` | `paymongo-public-key` | ✅ Ready |
| PayMongo Webhook | `whsec_placeholder` | `paymongo-webhook-secret` | ⚠️ Setup needed |
| Google Maps | `AIzaSy...` | `google-maps-api-key` | ✅ Ready |
| Weather API | `test_weather_api_key` | N/A | ⚠️ Optional |
| JWT Secret | `test_jwt_secret...` | `jwt-secret` | ❌ Not in GCP yet |
| Database URL | `postgresql://...` | `database-url` | ❌ Not in GCP yet |

---

## 🚨 Security Checklist

### Development
- [ ] `.env` file is in `.gitignore`
- [ ] No real production keys in `.env`
- [ ] Test mode enabled for all services
- [ ] `USE_SECRET_MANAGER=false`

### Production
- [ ] All secrets in GCP Secret Manager
- [ ] Service account has minimal permissions
- [ ] Service account key is secured
- [ ] `USE_SECRET_MANAGER=true`
- [ ] No `.env` file in production (use GCP Secret Manager)
- [ ] Secrets rotated regularly (every 90 days)
- [ ] No placeholder values in GCP

---

## 🔍 Troubleshooting

### Issue: "Secret not found in GCP"

**Solution:**
```bash
# List all secrets
gcloud secrets list --project=parkpal-production

# Check secret exists
gcloud secrets describe my-secret-name

# Add version if missing
echo -n "secret_value" | gcloud secrets versions add my-secret-name --data-file=-
```

### Issue: "Permission denied accessing secret"

**Solution:**
```bash
# Grant access to service account
gcloud secrets add-iam-policy-binding my-secret-name \
  --member="serviceAccount:parkpal-backend@parkpal-production.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Issue: "API key validation failing"

**Check:**
1. Key is not a placeholder (`test_*`, `your_*`)
2. Key is not empty
3. Key format is correct (e.g., `sk_live_*` for PayMongo)

```javascript
// Add debug logging
const key = await secretManager.getSecret('my-key');
console.log('Retrieved key length:', key?.length);
console.log('Key prefix:', key?.substring(0, 10));
```

---

## 📚 Code Examples

### Example 1: PayMongo Service (Current Implementation)

**File:** `services/paymongo.js`
```javascript
const secretManager = require('../config/secretManager');

class PayMongoService {
  async initialize() {
    // ✅ Correct: Uses Secret Manager
    this.secretKey = await secretManager.getSecret('paymongo-secret-key');
    this.publicKey = await secretManager.getSecret('paymongo-public-key');

    if (!this.secretKey || this.secretKey.startsWith('test_')) {
      console.warn('⚠️ PayMongo not configured properly');
    }
  }
}
```

### Example 2: Google Maps API (Current Implementation)

**File:** `controllers/configController.js`
```javascript
async function getGoogleMapsApiKey(req, res) {
  // ✅ Correct: Uses Secret Manager
  const apiKey = await secretManager.getSecret('google-maps-api-key');

  if (!apiKey) {
    return res.status(500).json({
      error: 'Google Maps API key not configured'
    });
  }

  res.json({ apiKey });
}
```

### Example 3: Weather API (Needs Improvement)

**File:** `controllers/alertsController.js`
```javascript
// ❌ Current: Direct process.env
const weatherApiKey = process.env.WEATHER_API_KEY;

// ✅ Suggested improvement:
const weatherApiKey = await secretManager.getSecret('weather-api-key');
```

---

## 🎯 TODO: Migrate to Secret Manager

### Priority 0 (Critical)
- [ ] **JWT Secret** - `services/auth.js`
  - Current: `process.env.JWT_SECRET`
  - Target: `secretManager.getSecret('jwt-secret')`

### Priority 1 (High)
- [ ] **Database URL** - `prisma/schema.prisma`, `index.js`
  - Current: `process.env.DATABASE_URL`
  - Target: `secretManager.getSecret('database-url')`

### Priority 2 (Medium)
- [ ] **Redis URL** - `config/redis.js`
  - Current: `process.env.REDIS_URL`
  - Target: `secretManager.getSecret('redis-url')`

### Optional
- [ ] **Weather API** - `controllers/alertsController.js`
  - Current: `process.env.WEATHER_API_KEY`
  - Target: `secretManager.getSecret('weather-api-key')`

---

## 📖 Related Documentation

- **PayMongo Setup:** `docs/PAYMONGO_SETUP.md`
- **Security Audit:** `BACKEND_SECURITY_PERFORMANCE_AUDIT.md`
- **GCP Secret Manager:** https://cloud.google.com/secret-manager/docs
- **Environment Setup:** `backend/ENV_SETUP.md`

---

**Last Updated:** December 16, 2025
**Reviewed By:** Claude Code
**Next Review:** After production deployment

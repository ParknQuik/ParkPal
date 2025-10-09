# GCP Secret Manager Integration Guide

This guide explains how to set up and use Google Cloud Platform (GCP) Secret Manager to securely store the Google Maps API key and other sensitive credentials.

## Overview

The ParkPal backend uses GCP Secret Manager to store sensitive credentials like API keys, preventing them from being exposed in code or environment files. The mobile app fetches these credentials from the backend via secure API endpoints.

## Architecture

```
Mobile App → Backend API (/api/config/maps-api-key) → GCP Secret Manager → Google Maps API Key
```

**Benefits:**
- ✅ API keys never stored in mobile app code
- ✅ Centralized secret management
- ✅ Easy rotation without app redeployment
- ✅ Audit logging of secret access
- ✅ Fallback to environment variables for local development

---

## Setup Instructions

### 1. Enable GCP Secret Manager API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Library**
4. Search for "Secret Manager API"
5. Click **Enable**

### 2. Create a Service Account

1. Navigate to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name: `parkpal-backend-service`
4. Description: `Service account for ParkPal backend to access Secret Manager`
5. Click **Create and Continue**

### 3. Grant Permissions

Assign the following roles to the service account:
- **Secret Manager Secret Accessor** - Allows reading secrets
- **Secret Manager Secret Version Manager** (optional) - Allows creating/updating secrets

### 4. Create Service Account Key

1. Click on the newly created service account
2. Go to **Keys** tab
3. Click **Add Key** > **Create New Key**
4. Choose **JSON** format
5. Download the key file (e.g., `parkpal-service-account-key.json`)
6. **Store this file securely** - it grants access to your GCP project!

### 5. Store the Service Account Key

**On your server:**
```bash
# Create a secure directory
mkdir -p /etc/parkpal/secrets
chmod 700 /etc/parkpal/secrets

# Copy the key file
cp parkpal-service-account-key.json /etc/parkpal/secrets/
chmod 600 /etc/parkpal/secrets/parkpal-service-account-key.json
```

**For local development:**
Store the key in your backend directory and add it to `.gitignore`:
```bash
# In backend/.gitignore
parkpal-service-account-key.json
*.json
```

### 6. Create Secrets in GCP

You can create secrets via the Google Cloud Console or using the backend API.

**Option A: Google Cloud Console**
1. Navigate to **Security** > **Secret Manager**
2. Click **Create Secret**
3. Name: `google-maps-api-key`
4. Secret value: Your Google Maps API key
5. Click **Create Secret**

**Option B: Using Backend API (requires authentication)**
```bash
curl -X POST http://localhost:3001/api/config/secrets \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "secretName": "google-maps-api-key",
    "secretValue": "AIzaSy..."
  }'
```

### 7. Configure Backend Environment Variables

Update your `.env` file:

```bash
# GCP Secret Manager Configuration
USE_SECRET_MANAGER=true
GCP_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=/etc/parkpal/secrets/parkpal-service-account-key.json

# Fallback for local development (when USE_SECRET_MANAGER=false)
MAPS_API_KEY=your_local_maps_api_key
```

**For production:**
```bash
USE_SECRET_MANAGER=true
GCP_PROJECT_ID=parkpal-prod
GOOGLE_APPLICATION_CREDENTIALS=/etc/parkpal/secrets/parkpal-service-account-key.json
```

**For local development:**
```bash
USE_SECRET_MANAGER=false
MAPS_API_KEY=AIzaSy...
```

### 8. Restart Backend Server

```bash
cd backend
npm run dev  # For development
# OR
npm start    # For production
```

---

## Usage

### Backend: Accessing Secrets

```javascript
const secretManager = require('./config/secretManager');

// Initialize (done automatically in index.js)
secretManager.initialize();

// Get a single secret
const apiKey = await secretManager.getSecret('google-maps-api-key');

// Get multiple secrets
const secrets = await secretManager.getSecrets([
  'google-maps-api-key',
  'stripe-secret-key',
  'jwt-secret'
]);

console.log(secrets['google-maps-api-key']);
```

### Mobile App: Fetching Google Maps API Key

```typescript
import mapsConfig from './services/mapsConfig';

// Get API key (automatically cached for 24 hours)
const apiKey = await mapsConfig.getApiKey();

// Use in Google Maps component
<MapView
  provider={PROVIDER_GOOGLE}
  apiKey={apiKey}
  {...otherProps}
/>

// Manually refresh if needed
const newApiKey = await mapsConfig.refreshApiKey();

// Clear cache (e.g., on logout)
await mapsConfig.clearCache();
```

---

## API Endpoints

### Get Google Maps API Key
```
GET /api/config/maps-api-key
Authorization: Bearer <token>
```

**Response:**
```json
{
  "apiKey": "AIzaSy..."
}
```

### Get App Configuration
```
GET /api/config/app
```

**Response:**
```json
{
  "mapsProvider": "google",
  "features": {
    "marketplace": true,
    "analytics": false,
    "qrCheckIn": true,
    "reviews": true
  },
  "version": "1.0.0"
}
```

---

## Security Best Practices

### ✅ DO:
- Use Secret Manager in production environments
- Rotate API keys regularly (every 90 days recommended)
- Restrict service account permissions to minimum required
- Use different GCP projects for dev/staging/production
- Enable audit logging for secret access
- Store service account keys securely with restricted permissions

### ❌ DON'T:
- Commit service account keys to version control
- Store API keys in mobile app code or config files
- Share service account keys via email or messaging
- Use the same API keys across dev/staging/production
- Grant unnecessary permissions to service accounts

---

## Troubleshooting

### Error: "Secret Manager client not initialized"
**Solution:** Ensure `USE_SECRET_MANAGER=true` and `GCP_PROJECT_ID` is set in `.env`

### Error: "Failed to retrieve secret"
**Possible causes:**
1. Service account lacks permissions → Add "Secret Manager Secret Accessor" role
2. Secret doesn't exist → Create the secret in GCP Console
3. Invalid credentials → Check `GOOGLE_APPLICATION_CREDENTIALS` path

**Fallback:** The system will automatically fall back to environment variables if Secret Manager fails

### Error: "GOOGLE_APPLICATION_CREDENTIALS not set"
**Solution:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
# OR set it in .env file
```

### Mobile App: "Failed to get Google Maps API key"
**Check:**
1. Backend is running and accessible
2. User is authenticated (token is valid)
3. Backend can access Secret Manager or has fallback env var
4. Network connectivity between app and backend

---

## Cost Considerations

**GCP Secret Manager Pricing (as of 2024):**
- Secret versions: $0.06 per active secret version per month
- Access operations: $0.03 per 10,000 operations

**Estimated monthly cost for ParkPal:**
- 5 secrets × $0.06 = $0.30/month
- ~100,000 API key fetches (1 per user session) = $0.30/month
- **Total: ~$0.60/month** (negligible)

---

## Alternative: Local Development Without Secret Manager

For local development, you can disable Secret Manager:

```bash
# backend/.env
USE_SECRET_MANAGER=false
MAPS_API_KEY=AIzaSy...
JWT_SECRET=local_dev_secret
STRIPE_SECRET_KEY=sk_test_...
```

The backend will use environment variables as fallback automatically.

---

## Migration Checklist

- [ ] Enable Secret Manager API in GCP
- [ ] Create service account with proper permissions
- [ ] Download service account key JSON
- [ ] Store service account key securely
- [ ] Create secrets in GCP Secret Manager
- [ ] Update backend `.env` with GCP config
- [ ] Test backend can retrieve secrets
- [ ] Update mobile app to fetch API key from backend
- [ ] Test mobile app can get API key and use Maps
- [ ] Remove hardcoded API keys from codebase
- [ ] Update CI/CD to use Secret Manager
- [ ] Document the process for team members

---

## Next Steps

1. **Rotate secrets regularly:** Set up a calendar reminder to rotate API keys every 90 days
2. **Add more secrets:** Migrate JWT_SECRET, database passwords, payment keys to Secret Manager
3. **Set up monitoring:** Enable GCP audit logs to track secret access
4. **Automate rotation:** Consider using GCP Secret Manager rotation features for automatic key rotation

---

## References

- [GCP Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [Google Maps Platform API Security](https://developers.google.com/maps/api-security-best-practices)

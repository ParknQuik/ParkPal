# Environment Variables Setup Guide

This guide explains how to configure all required environment variables for the ParknQuik backend.

## Quick Setup

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Update the values in `.env` according to the sections below.

## Required Variables

### JWT_SECRET
**Purpose:** Secret key for signing JWT authentication tokens

**How to generate:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Example:**
```
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

## Optional Variables

### WEATHER_API_KEY
**Purpose:** Enable weather alerts feature

**How to get:**
1. Sign up at https://openweathermap.org/api
2. Navigate to https://home.openweathermap.org/api_keys
3. Generate a new API key (free tier: 1,000 calls/day)

**Example:**
```
WEATHER_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Note:** If not configured, the alerts endpoint will return null.

### GOOGLE_MAPS_API_KEY
**Purpose:** Geocoding addresses to coordinates

**How to get:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new API key
3. Restrict it to "Geocoding API" and "Maps JavaScript API"

**Example:**
```
GOOGLE_MAPS_API_KEY=AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456
```

### REDIS_URL
**Purpose:** Caching layer for improved performance

**How to setup:**
```bash
# Install Redis locally
brew install redis  # macOS
# or
sudo apt-get install redis-server  # Ubuntu

# Start Redis
redis-server
```

**Example:**
```
REDIS_URL=redis://localhost:6379
```

## Production Variables

### DATABASE_URL (PostgreSQL)
**Purpose:** Production-grade database

**Example:**
```
DATABASE_URL=postgresql://user:password@db.example.com:5432/parkpal?schema=public
```

**How to migrate from SQLite:**
1. Export SQLite data
2. Update `prisma/schema.prisma` datasource to `postgresql`
3. Run `npx prisma migrate dev`
4. Import data

### GCP Secret Manager
**Purpose:** Securely store API keys in production

**Setup:**
1. Create GCP project
2. Enable Secret Manager API
3. Create service account with Secret Manager access
4. Download service account key JSON

**Example:**
```
USE_SECRET_MANAGER=true
GCP_PROJECT_ID=parkpal-production
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### GCP Cloud Storage (Photo Upload)
**Purpose:** Store and serve parking spot photos

**Setup:**
1. Create GCS bucket in GCP Console
   ```bash
   gsutil mb -p parkpal-production gs://parkpal-photos
   gsutil uniformbucketlevelaccess set on gs://parkpal-photos
   ```

2. Set up CORS for web uploads:
   ```bash
   echo '[{"origin": ["*"], "method": ["GET", "PUT"], "responseHeader": ["Content-Type"], "maxAgeSeconds": 3600}]' > cors.json
   gsutil cors set cors.json gs://parkpal-photos
   ```

3. Grant service account permissions:
   - Storage Object Creator (for uploads)
   - Storage Object Viewer (for public access)

**Example:**
```
GCS_BUCKET_NAME=parkpal-photos
GCP_KEYFILE_PATH=/path/to/service-account-key.json
```

**Note:** Uses same GCP_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS as Secret Manager

## Verification

Test your configuration:

```bash
# Check JWT secret
curl http://localhost:3001/health

# Test weather API
curl http://localhost:3001/api/alerts

# Test authenticated endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/marketplace/search
```

## Security Notes

1. **Never commit `.env` to git** - Already in `.gitignore`
2. **Rotate JWT_SECRET in production** - Invalidates all tokens
3. **Use different secrets for dev/prod** - Prevent cross-environment access
4. **Restrict API keys** - Set domain/IP restrictions in Google Cloud Console
5. **Enable rate limiting** - Already configured (5 auth attempts/15min)

## Troubleshooting

### Weather API not working
- Check if key is valid: https://api.openweathermap.org/data/2.5/weather?q=London&appid=YOUR_KEY
- Free tier has 1,000 calls/day limit
- New keys take ~10 minutes to activate

### Database connection errors
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify user permissions

### Redis connection errors
- Check if Redis is running: `redis-cli ping`
- Should return "PONG"
- Redis is optional - app works without it

## Environment-Specific Setup

### Development
```
NODE_ENV=development
DATABASE_URL=file:./dev.db
USE_SECRET_MANAGER=false
```

### Production
```
NODE_ENV=production
DATABASE_URL=postgresql://...
USE_SECRET_MANAGER=true
```

### Testing
```
NODE_ENV=test
DATABASE_URL=file:./test.db
JWT_SECRET=test_secret_do_not_use_in_production
```

# Mobile App Deployment Environments

**Last Updated:** March 14, 2026

This document explains how backend URLs are configured for different environments (local dev, dev builds, staging, production).

---

## Environment Overview

| Environment | Backend URL | Use Case | Build Command |
|-------------|-------------|----------|---------------|
| **Local Development** | `localhost` / `10.0.2.2` | Daily coding | `npm start` |
| **Development Build** | `parkpal-backend-dev` | Internal testing | `eas build --profile development` |
| **Staging/QA** | `parkpal-backend-staging` | QA testing | `eas build --profile staging` |
| **Production** | `parkpal-backend-prod` | App Store release | `eas build --profile production` |

---

## How It Works

### Configuration Priority (Top to Bottom)

1. **EAS Build Environment** (`eas.json`) - When building with EAS
2. **Environment File** (`.env.{environment}`) - Loaded by app.config.js
3. **Local Override** (`.env.local`) - Developer-specific settings
4. **Platform Defaults** - iOS/Android simulator defaults

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Are you building with EAS?                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ YES: EAS Build (eas build)                                  │
│  ├─ eas.json env vars override everything                   │
│  ├─ development: → parkpal-backend-dev                      │
│  ├─ staging: → parkpal-backend-staging                      │
│  └─ production: → parkpal-backend-prod                      │
│                                                              │
│ NO: Local Development (npm start)                           │
│  ├─ .env.local exists?                                      │
│  │   ├─ YES: Use EXPO_PUBLIC_API_URL from .env.local       │
│  │   └─ NO: ↓                                               │
│  ├─ Check .env.{EXPO_PUBLIC_ENV} file                      │
│  └─ Fall back to platform defaults:                         │
│      ├─ iOS: http://localhost:3001/api/v1                  │
│      └─ Android: http://10.0.2.2:3001/api/v1               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment Files

### `.env.local` (Not committed)

Your personal overrides for local development:

```bash
# .env.local
EXPO_PUBLIC_ENV=development

# Leave commented for platform defaults (localhost/10.0.2.2)
# Or uncomment to override:
# EXPO_PUBLIC_API_URL=http://192.168.100.221:3001/api/v1

GOOGLE_MAPS_API_KEY_IOS=AIzaSy...
GOOGLE_MAPS_API_KEY_ANDROID=AIzaSy...
```

**Priority:** Highest (overrides everything in local development)
**Git:** Ignored (`.gitignore`)

### `.env.development` (Committed)

Defaults for local development:

```bash
# .env.development
EXPO_PUBLIC_ENV=development

# Platform defaults - no explicit API URL
# iOS: http://localhost:3001/api/v1
# Android: http://10.0.2.2:3001/api/v1

GOOGLE_MAPS_API_KEY_IOS=YOUR_IOS_API_KEY_HERE
GOOGLE_MAPS_API_KEY_ANDROID=YOUR_ANDROID_API_KEY_HERE
```

**Priority:** Low (used if.env.local doesn't exist)
**Git:** Committed

### `.env.staging` (Committed)

Staging environment configuration:

```bash
# .env.staging
EXPO_PUBLIC_ENV=staging
EXPO_PUBLIC_API_URL=https://parkpal-backend-staging-cxntrkjjmq-as.a.run.app/api/v1

GOOGLE_MAPS_API_KEY_IOS=YOUR_IOS_API_KEY_HERE
GOOGLE_MAPS_API_KEY_ANDROID=YOUR_ANDROID_API_KEY_HERE
```

**Priority:** Low (overridden by eas.json in EAS builds)
**Git:** Committed

### `.env.production` (Committed)

Production environment configuration:

```bash
# .env.production
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_API_URL=https://parkpal-backend-prod-cxntrkjjmq-as.a.run.app/api/v1

GOOGLE_MAPS_API_KEY_IOS=YOUR_IOS_API_KEY_HERE
GOOGLE_MAPS_API_KEY_ANDROID=YOUR_ANDROID_API_KEY_HERE
```

**Priority:** Low (overridden by eas.json in EAS builds)
**Git:** Committed

---

## EAS Build Configuration

### `eas.json`

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_ENV": "development",
        "EXPO_PUBLIC_API_URL": "https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api/v1"
      }
    },
    "staging": {
      "env": {
        "EXPO_PUBLIC_ENV": "staging",
        "EXPO_PUBLIC_API_URL": "https://parkpal-backend-staging-cxntrkjjmq-as.a.run.app/api/v1"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_ENV": "production",
        "EXPO_PUBLIC_API_URL": "https://parkpal-backend-prod-cxntrkjjmq-as.a.run.app/api/v1"
      }
    }
  }
}
```

**Priority:** Highest (when building with EAS)
**Git:** Committed

---

## Common Scenarios

### Scenario 1: Local Development (Daily Work)

```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start mobile app
cd frontend/mobile && npm start
# Press 'i' for iOS or 'a' for Android
```

**Backend Used:**
- iOS Simulator: `http://localhost:3001/api/v1`
- Android Emulator: `http://10.0.2.2:3001/api/v1`

**How:** Platform defaults (no env var set)

### Scenario 2: Test on Physical Device

```bash
# Get your machine's IP
ipconfig getifaddr en0  # macOS
# Example output: 192.168.100.221

# Add to .env.local
echo "EXPO_PUBLIC_API_URL=http://192.168.100.221:3001/api/v1" >> .env.local

# Restart app
npm start
```

**Backend Used:** Your machine's IP address
**How:** `.env.local` override

### Scenario 3: Test Against Deployed Dev Backend

```bash
# Uncomment in .env.local
EXPO_PUBLIC_API_URL=https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api/v1

# Restart app
npm start
```

**Backend Used:** Deployed dev backend
**How:** `.env.local` override

### Scenario 4: Build Development Version (Internal Testing)

```bash
# Build with EAS
eas build --platform ios --profile development
eas build --platform android --profile development
```

**Backend Used:** `https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api/v1`
**How:** `eas.json` env vars (highest priority in EAS builds)

### Scenario 5: Build Staging Version (QA Testing)

```bash
# Build with EAS
eas build --platform ios --profile staging
eas build --platform android --profile staging
```

**Backend Used:** `https://parkpal-backend-staging-cxntrkjjmq-as.a.run.app/api/v1`
**How:** `eas.json` env vars

### Scenario 6: Build Production Version (App Store)

```bash
# Build with EAS
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

**Backend Used:** `https://parkpal-backend-prod-cxntrkjjmq-as.a.run.app/api/v1`
**How:** `eas.json` env vars

---

## Backend URLs Reference

| Environment | Backend URL |
|-------------|-------------|
| Local (iOS) | `http://localhost:3001/api/v1` |
| Local (Android) | `http://10.0.2.2:3001/api/v1` |
| Local (Physical) | `http://192.168.x.x:3001/api/v1` (your IP) |
| Development | `https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api/v1` |
| Staging | `https://parkpal-backend-staging-cxntrkjjmq-as.a.run.app/api/v1` |
| Production | `https://parkpal-backend-prod-cxntrkjjmq-as.a.run.app/api/v1` |

---

## Verifying Configuration

### In Local Development

Check Metro bundler logs:
```
📡 API Configuration:
  Base URL: http://localhost:3001/api/v1
  Backend: 🏠 Local
```

Check app's DevModeIndicator:
- 🏠 Green badge = Local backend
- ☁️ Blue badge = Deployed backend

### In EAS Builds

Check build logs:
```bash
eas build:list

# View specific build
eas build:view <build-id>
```

Look for environment variables in build logs:
```
› EXPO_PUBLIC_ENV: production
› EXPO_PUBLIC_API_URL: https://parkpal-backend-prod-...
```

---

## Troubleshooting

### Issue: Local dev connects to deployed backend

**Cause:** `EXPO_PUBLIC_API_URL` set in `.env.local`

**Fix:**
```bash
# Comment out or remove from .env.local
# EXPO_PUBLIC_API_URL=...

# Restart app
npm start -- --clear
```

### Issue: EAS build uses wrong backend

**Cause:** Wrong profile or missing env vars in `eas.json`

**Fix:**
```bash
# Check eas.json profile
cat eas.json

# Rebuild with correct profile
eas build --platform ios --profile production
```

### Issue: Production build still shows dev backend

**Cause:** Build used wrong profile

**Fix:**
```bash
# Verify build profile
eas build:list

# Rebuild with production profile
eas build --platform ios --profile production
```

### Issue: Can't connect to backend in any environment

**Cause:** Network or backend issue

**Fix:**
```bash
# Test backend directly
curl https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api/v1/health

# Check backend logs
gcloud run services logs read parkpal-backend-dev --project parkpal-474417
```

---

## Best Practices

1. ✅ **Keep `.env.local` minimal**
   - Only override when testing specific scenarios
   - Default behavior works for 90% of development

2. ✅ **Commit environment files**
   - `.env.development`, `.env.staging`, `.env.production` should be committed
   - Provides team consistency
   - Documents expected configuration

3. ✅ **Use EAS Secrets for sensitive data**
   ```bash
   # Store API keys in EAS
   eas secret:create --scope project --name GOOGLE_MAPS_API_KEY_IOS --value "AIzaSy..."
   ```

4. ✅ **Test each profile before release**
   - Development build → Internal testers
   - Staging build → QA team
   - Production build → App Store submission

5. ✅ **Verify backend in each build**
   - Check build logs for EXPO_PUBLIC_API_URL
   - Test first API call after install
   - Monitor DevModeIndicator (dev builds only)

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Mobile App

on:
  push:
    branches: [main, develop, staging]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build for staging
        if: github.ref == 'refs/heads/staging'
        run: eas build --platform all --profile staging --non-interactive

      - name: Build for production
        if: github.ref == 'refs/heads/main'
        run: eas build --platform all --profile production --non-interactive
```

---

## Summary Table

| Scenario | Command | Backend | Priority Source |
|----------|---------|---------|-----------------|
| Local iOS Dev | `npm start` | localhost:3001 | Platform default |
| Local Android Dev | `npm start` | 10.0.2.2:3001 | Platform default |
| Physical Device | `npm start` | 192.168.x.x:3001 | `.env.local` |
| Dev Build | `eas build --profile development` | parkpal-backend-dev | `eas.json` |
| Staging Build | `eas build --profile staging` | parkpal-backend-staging | `eas.json` |
| Prod Build | `eas build --profile production` | parkpal-backend-prod | `eas.json` |

---

**Status:** ✅ Production Ready
**Last Updated:** March 14, 2026

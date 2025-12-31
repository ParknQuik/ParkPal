# Google Maps API Key Setup Guide

This guide explains how to securely configure Google Maps API keys for the ParknQuik mobile app.

## Table of Contents
- [Quick Start for New Developers](#quick-start-for-new-developers)
- [Creating Google Maps API Keys](#creating-google-maps-api-keys)
- [Local Development Setup](#local-development-setup)
- [EAS Build Configuration](#eas-build-configuration)
- [CI/CD Pipeline Setup](#cicd-pipeline-setup)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick Start for New Developers

### 1. Install Dependencies
```bash
cd frontend/mobile
npm install
```

### 2. Create Your Local Environment File
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your actual API keys
# (This file is gitignored and will never be committed)
```

### 3. Get Your Google Maps API Keys
Follow the [Creating Google Maps API Keys](#creating-google-maps-api-keys) section below.

### 4. Update .env.local
```bash
# Open .env.local and replace the placeholder values
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3001/api/v1
GOOGLE_MAPS_API_KEY_IOS=your_actual_ios_key_here
GOOGLE_MAPS_API_KEY_ANDROID=your_actual_android_key_here
```

### 5. Start the App
```bash
npm start
```

---

## Creating Google Maps API Keys

### Prerequisites
- Google Cloud Platform account
- Billing enabled (Google Maps requires billing, but includes $200/month free credit)

### Step 1: Create a GCP Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing: `parknquik-mobile-dev`
3. Enable billing for the project

### Step 2: Enable Required APIs
Enable these APIs for your project:
- Maps SDK for iOS
- Maps SDK for Android
- Places API
- Geocoding API
- Directions API (if using navigation features)

```bash
# Using gcloud CLI (optional):
gcloud services enable \
  maps-ios-backend.googleapis.com \
  maps-android-backend.googleapis.com \
  places-backend.googleapis.com \
  geocoding-backend.googleapis.com
```

### Step 3: Create iOS API Key
1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → API Key**
3. Click **Restrict Key** (very important for security)
4. Name: `ParknQuik iOS Development` (or similar)
5. Under **Application restrictions**:
   - Select **iOS apps**
   - Add bundle identifier: `com.parknquik.mobile`
6. Under **API restrictions**:
   - Select **Restrict key**
   - Choose: Maps SDK for iOS, Places API, Geocoding API
7. Click **Save**

### Step 4: Create Android API Key
1. Click **Create Credentials → API Key** again
2. Click **Restrict Key**
3. Name: `ParknQuik Android Development`
4. Under **Application restrictions**:
   - Select **Android apps**
   - Click **Add an item**
   - Add package name: `com.parknquik.mobile`
   - Add SHA-1 fingerprint (see below)
5. Under **API restrictions**:
   - Select **Restrict key**
   - Choose: Maps SDK for Android, Places API, Geocoding API
6. Click **Save**

### Getting Android SHA-1 Fingerprint

For **development** (debug keystore):
```bash
# macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Windows
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

For **production** (release keystore):
```bash
# Get from your release keystore
keytool -list -v -keystore /path/to/release.keystore -alias your_alias

# Or use EAS-generated keystore
npx eas credentials
```

### Step 5: Create Separate Keys for Each Environment
Repeat steps 3-4 for:
- **Staging keys** (restrict to staging app identifiers)
- **Production keys** (restrict to production app identifiers)

---

## Local Development Setup

### Environment Files Hierarchy
The app loads environment variables in this order (later files override earlier ones):

1. `.env.development` (committed, has placeholders)
2. `.env.local` (NOT committed, your actual keys)
3. `.env` (NOT committed, alternative to .env.local)

### Recommended Setup
```bash
# 1. Keep .env.development with placeholders (already committed)
# 2. Create .env.local with your real keys (gitignored)
cp .env.example .env.local

# 3. Edit .env.local
nano .env.local
```

### Finding Your Local IP (for EXPO_PUBLIC_API_URL)
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig

# Then use: http://YOUR_IP:3001/api/v1
```

### Verifying Configuration
```bash
# Start the app
npm start

# Check logs for:
# ✅ "Environment variables loaded successfully"
# ❌ "Missing required environment variables" (means you need to add keys)
```

---

## EAS Build Configuration

EAS (Expo Application Services) is used for building production apps.

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Step 2: Initialize EAS Project
```bash
cd frontend/mobile
eas init
```

### Step 3: Configure Environment Secrets
Store sensitive keys in EAS (never in .env files):

```bash
# Development environment
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY_IOS --value "your_dev_ios_key" --type string
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY_ANDROID --value "your_dev_android_key" --type string
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "http://dev-api.parknquik.com/api/v1" --type string

# Staging environment
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY_IOS_STAGING --value "your_staging_ios_key" --type string
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY_ANDROID_STAGING --value "your_staging_android_key" --type string
eas secret:create --scope project --name EXPO_PUBLIC_API_URL_STAGING --value "https://staging-api.parknquik.com/api/v1" --type string

# Production environment
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY_IOS_PRODUCTION --value "your_prod_ios_key" --type string
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY_ANDROID_PRODUCTION --value "your_prod_android_key" --type string
eas secret:create --scope project --name EXPO_PUBLIC_API_URL_PRODUCTION --value "https://api.parknquik.com/api/v1" --type string
```

### Step 4: Update eas.json for Environment-Specific Secrets
The `eas.json` file is already configured. For environment-specific builds:

```bash
# Development build
eas build --profile development --platform ios

# Staging build
eas build --profile staging --platform all

# Production build
eas build --profile production --platform all
```

### Step 5: Verify Secrets
```bash
# List all secrets
eas secret:list

# Delete a secret (if needed)
eas secret:delete --name SECRET_NAME
```

---

## CI/CD Pipeline Setup

### GitHub Actions Example
Create `.github/workflows/eas-build.yml`:

```yaml
name: EAS Build

on:
  push:
    branches: [main, staging]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: |
          cd frontend/mobile
          npm install

      - name: Build for production
        if: github.ref == 'refs/heads/main'
        run: |
          cd frontend/mobile
          eas build --platform all --profile production --non-interactive

      - name: Build for staging
        if: github.ref == 'refs/heads/staging'
        run: |
          cd frontend/mobile
          eas build --platform all --profile staging --non-interactive
```

### Required GitHub Secrets
Add to your GitHub repository settings:

1. **EXPO_TOKEN**: Get from `eas whoami` (personal access token)
   ```bash
   eas whoami
   # Copy your token and add to GitHub Secrets
   ```

2. API keys are stored in EAS Secrets (not GitHub), so no need to add them to GitHub.

---

## Security Best Practices

### ✅ DO:
1. **Restrict API keys** by platform (iOS/Android) and bundle ID
2. **Use separate keys** for development, staging, and production
3. **Store secrets in EAS** for builds (not in .env files)
4. **Enable billing alerts** in Google Cloud Console
5. **Monitor API usage** regularly
6. **Rotate keys** periodically (every 90 days recommended)
7. **Use .env.local** for personal development keys (gitignored)

### ❌ DON'T:
1. **Never commit** `.env`, `.env.local`, or files with real API keys
2. **Never share** API keys in Slack, email, or public channels
3. **Never use production keys** in development
4. **Never disable key restrictions** (always restrict to bundle ID/package name)
5. **Don't hardcode** keys in source code

### Key Restrictions Checklist
- [ ] iOS key restricted to `com.parknquik.mobile` bundle ID
- [ ] Android key restricted to package name + SHA-1 fingerprint
- [ ] API restrictions enabled (Maps SDK, Places API, Geocoding API only)
- [ ] Quota limits set in Google Cloud Console
- [ ] Billing alerts configured
- [ ] Separate keys for dev/staging/production

### Handling Key Leaks
If a key is accidentally committed or exposed:

1. **Immediately revoke** the key in Google Cloud Console
2. **Generate a new key** with proper restrictions
3. **Update EAS secrets** with new key
4. **Review git history** and consider rewriting history if needed
5. **Monitor billing** for unexpected usage

---

## Troubleshooting

### Maps Not Loading
**Symptom**: Gray screen or "This app is not authorized to use Google Maps"

**Solutions**:
1. Verify API key in `.env.local` is correct
2. Check bundle ID matches in Google Cloud Console:
   - iOS: `com.parknquik.mobile`
   - Android: `com.parknquik.mobile`
3. Verify APIs are enabled (Maps SDK for iOS/Android)
4. Check SHA-1 fingerprint for Android
5. Wait 5-10 minutes after creating/updating keys (propagation time)
6. Clear Expo cache: `npx expo start -c`

### Environment Variables Not Loading
**Symptom**: App shows "Missing required environment variables"

**Solutions**:
1. Ensure `.env.local` exists and has all required variables
2. Restart Metro bundler: `npx expo start --clear`
3. Verify `dotenv` is installed: `npm install dotenv --save-dev`
4. Check `app.config.js` is being used (not `app.json`)
5. Ensure variable names match exactly (case-sensitive)

### EAS Build Fails
**Symptom**: Build fails with "Environment variable not set"

**Solutions**:
1. Verify secrets are set: `eas secret:list`
2. Ensure secret names match `eas.json` configuration
3. Check EAS project is initialized: `eas init`
4. Verify you're logged in: `eas whoami`
5. Check build logs for specific error

### Different Keys for Different Environments
**Question**: How do I use different keys for dev vs production?

**Answer**:
- Local dev: Use `.env.local` with dev keys
- EAS builds: Use environment-specific secrets:
  ```bash
  # In eas.json, reference different secrets per profile
  "production": {
    "env": {
      "GOOGLE_MAPS_API_KEY_IOS": "@GOOGLE_MAPS_API_KEY_IOS_PRODUCTION"
    }
  }
  ```

### Finding API Usage/Costs
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services → Dashboard**
4. Click on **Maps SDK for iOS/Android**
5. View quota and billing details

---

## Additional Resources

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [Expo Application Services](https://expo.dev/eas)

---

## Support

If you encounter issues not covered in this guide:

1. Check the [troubleshooting section](#troubleshooting)
2. Search existing issues in the project repository
3. Ask in the team Slack channel: `#mobile-dev`
4. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Environment (iOS/Android, dev/staging/prod)
   - Screenshots (with API keys redacted!)

---

**Last Updated**: 2025-12-15
**Maintained By**: ParkPal Mobile Team

# Environment Variables Setup - Quick Reference

## Overview
This project uses environment variables to securely manage Google Maps API keys and other sensitive configuration. API keys are **never** committed to Git.

## File Structure

```
frontend/mobile/
├── app.config.js              # Expo config (loads env vars from .env files)
├── .env.example               # Template (committed to Git)
├── .env.development           # Dev defaults (committed with placeholders)
├── .env.staging               # Staging defaults (committed with placeholders)
├── .env.production            # Prod defaults (committed with placeholders)
├── .env.local                 # YOUR KEYS (gitignored - never committed)
└── .env                       # Alternative to .env.local (gitignored)
```

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
cd frontend/mobile
npm install
```

### 2. Create Your Environment File
```bash
# Copy template to your local config
cp .env.example .env.local

# Edit with your actual keys
nano .env.local
```

### 3. Get Google Maps API Keys
See [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md) for detailed instructions.

**Quick version:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable: Maps SDK for iOS, Maps SDK for Android, Places API
3. Create 2 API keys (iOS + Android) with proper restrictions
4. Add to `.env.local`

### 4. Validate Setup
```bash
npm run env:check
```

### 5. Start Development
```bash
npm start
```

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_ENV` | Environment name | `development` |
| `EXPO_PUBLIC_API_URL` | Backend API URL | `http://192.168.1.100:3001/api/v1` |
| `GOOGLE_MAPS_API_KEY_IOS` | iOS Maps API key | `AIzaSyD...` |
| `GOOGLE_MAPS_API_KEY_ANDROID` | Android Maps API key | `AIzaSyD...` |

## Environment Hierarchy

Environment variables are loaded in this order (later overrides earlier):

1. `.env.development` (committed, placeholders)
2. `.env.local` (gitignored, **your actual keys**)
3. `.env` (gitignored, alternative to .env.local)

## For Different Environments

### Local Development
Use `.env.local` with your personal API keys:
```bash
cp .env.example .env.local
# Edit .env.local with your keys
```

### EAS Builds (Staging/Production)
Use EAS Secrets (stored securely in Expo):
```bash
# Install EAS CLI
npm install -g eas-cli

# Setup secrets interactively
npm run setup:eas

# Or manually:
eas secret:create --name GOOGLE_MAPS_API_KEY_IOS --value "your_key"
```

## Useful Commands

```bash
# Validate environment configuration
npm run env:check

# Start with specific environment
npm run start:dev
npm run start:staging

# Setup EAS secrets
npm run setup:eas

# Build for different environments
npm run build:dev:ios
npm run build:staging:android
npm run build:prod:ios
```

## Security Checklist

- ✅ `.env.local` is in `.gitignore`
- ✅ No API keys are hardcoded in source code
- ✅ Google Maps keys have platform restrictions (iOS/Android)
- ✅ Google Maps keys have API restrictions (Maps SDK, Places, etc.)
- ✅ Production keys are separate from development keys
- ✅ EAS Secrets are used for builds (not .env files)

## Common Issues

### "Missing required environment variables"
**Solution**: Create `.env.local` from `.env.example`
```bash
cp .env.example .env.local
# Edit .env.local with your actual keys
```

### Maps show gray screen
**Solution**:
1. Verify API keys are correct in `.env.local`
2. Check Google Cloud Console - ensure APIs are enabled
3. Wait 5-10 minutes (key propagation time)
4. Restart app: `npx expo start --clear`

### "Cannot connect to backend"
**Solution**: Use your machine's local IP (not localhost)
```bash
# Find your IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Update EXPO_PUBLIC_API_URL in .env.local
EXPO_PUBLIC_API_URL=http://YOUR_IP:3001/api/v1
```

## Documentation

- **[GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md)** - Complete setup guide
- **[QUICK_START.md](./QUICK_START.md)** - New developer onboarding
- **[IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)** - Full implementation checklist

## CI/CD

GitHub Actions automatically:
- ✅ Checks for accidentally committed `.env` files
- ✅ Scans for hardcoded API keys
- ✅ Validates `.env.example` is up to date
- ✅ Verifies `.gitignore` configuration
- ✅ Builds apps using EAS with secure secrets

## Team Setup

**For new team members:**
1. Read [QUICK_START.md](./QUICK_START.md)
2. Get development API keys from team lead
3. Create `.env.local` with keys
4. Run `npm run env:check` to validate
5. Start development!

**For CI/CD:**
- API keys are stored in EAS Secrets (not GitHub)
- Builds use environment-specific secrets
- No sensitive data in GitHub repository

## Support

- 📖 See troubleshooting in [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md#troubleshooting)
- 🔍 Run diagnostics: `npm run env:check`
- 💬 Ask in Slack: `#mobile-dev`

---

**Last Updated**: 2025-12-15

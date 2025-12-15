# Google Maps API Key Implementation Checklist

Use this checklist to ensure proper implementation and setup of Google Maps API keys.

## Pre-Implementation

- [ ] Read [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md) documentation
- [ ] Understand the security implications of API keys
- [ ] Have access to Google Cloud Console
- [ ] Have billing enabled on Google Cloud project

## Initial Setup

### 1. Install Dependencies
- [ ] Run `npm install` in `frontend/mobile`
- [ ] Verify `dotenv` is in `package.json` devDependencies
- [ ] Verify `app.config.js` exists (not `app.json`)

### 2. Create Google Cloud Project
- [ ] Create or select GCP project
- [ ] Enable billing for the project
- [ ] Note the project ID

### 3. Enable Required APIs
Enable the following in Google Cloud Console:
- [ ] Maps SDK for iOS
- [ ] Maps SDK for Android
- [ ] Places API
- [ ] Geocoding API
- [ ] Directions API (optional, for navigation features)

### 4. Create iOS API Key
- [ ] Create new API key in GCP Console
- [ ] Name it: `ParknQuik iOS Development`
- [ ] Add application restriction: iOS apps
- [ ] Add bundle identifier: `com.parknquik.mobile`
- [ ] Add API restrictions: Maps SDK for iOS, Places API, Geocoding API
- [ ] Save and copy the key

### 5. Create Android API Key
- [ ] Create new API key in GCP Console
- [ ] Name it: `ParknQuik Android Development`
- [ ] Add application restriction: Android apps
- [ ] Add package name: `com.parknquik.mobile`
- [ ] Get SHA-1 fingerprint (debug keystore)
- [ ] Add SHA-1 fingerprint to restrictions
- [ ] Add API restrictions: Maps SDK for Android, Places API, Geocoding API
- [ ] Save and copy the key

### 6. Local Development Setup
- [ ] Copy `.env.example` to `.env.local`
- [ ] Add your local IP to `EXPO_PUBLIC_API_URL`
- [ ] Add iOS API key to `GOOGLE_MAPS_API_KEY_IOS`
- [ ] Add Android API key to `GOOGLE_MAPS_API_KEY_ANDROID`
- [ ] Set `EXPO_PUBLIC_ENV=development`
- [ ] Verify `.env.local` is gitignored
- [ ] Run `npm run env:check` to validate

## Security Configuration

### Git Security
- [ ] Verify `.env` is in `.gitignore`
- [ ] Verify `.env.local` is in `.gitignore`
- [ ] Verify `.env*.local` is in `.gitignore`
- [ ] Check `git status` - ensure no .env files are staged
- [ ] Review `.gitignore` for other sensitive patterns

### API Key Restrictions
- [ ] iOS key restricted to bundle ID only
- [ ] Android key restricted to package name + SHA-1
- [ ] Both keys have API restrictions enabled
- [ ] No unrestricted keys in use
- [ ] Quota limits set in Google Cloud Console
- [ ] Billing alerts configured

## Testing

### Local Testing
- [ ] Backend is running (`npm run dev` in backend folder)
- [ ] Start mobile app: `npm start`
- [ ] Test on iOS Simulator
- [ ] Verify maps load correctly on iOS
- [ ] Test on Android Emulator
- [ ] Verify maps load correctly on Android
- [ ] Test location features
- [ ] Test search/autocomplete features

### Environment Validation
- [ ] Run `npm run env:check` - all checks pass
- [ ] Check console for any API key warnings
- [ ] Verify no hardcoded keys in source code
- [ ] Verify environment variables load correctly

## Staging/Production Setup

### Create Staging Keys
- [ ] Create separate iOS key for staging
- [ ] Create separate Android key for staging
- [ ] Restrict keys to staging bundle IDs/package names
- [ ] Test staging builds

### Create Production Keys
- [ ] Create separate iOS key for production
- [ ] Create separate Android key for production
- [ ] Restrict keys to production bundle IDs/package names
- [ ] Add production SHA-1 fingerprint (from release keystore)

### EAS Configuration
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Login to EAS: `eas login`
- [ ] Initialize EAS project: `eas init`
- [ ] Run setup script: `npm run setup:eas`
- [ ] Configure secrets for development environment
- [ ] Configure secrets for staging environment
- [ ] Configure secrets for production environment
- [ ] Verify secrets: `eas secret:list`

### Test Builds
- [ ] Test development build: `npm run build:dev:ios`
- [ ] Test development build: `npm run build:dev:android`
- [ ] Verify maps work in development build
- [ ] Test staging build: `npm run build:staging:ios`
- [ ] Test staging build: `npm run build:staging:android`
- [ ] Verify maps work in staging build

## CI/CD Setup

### GitHub Actions
- [ ] Review `.github/workflows/mobile-env-check.yml`
- [ ] Review `.github/workflows/mobile-eas-build.yml`
- [ ] Add `EXPO_TOKEN` to GitHub repository secrets
- [ ] Test CI environment check on a PR
- [ ] Test automated EAS build workflow

### Monitoring
- [ ] Set up quota alerts in Google Cloud Console
- [ ] Set up billing alerts
- [ ] Monitor API usage weekly
- [ ] Review API costs monthly

## Team Onboarding

### Documentation
- [ ] Share `GOOGLE_MAPS_SETUP.md` with team
- [ ] Share `QUICK_START.md` for new developers
- [ ] Document any project-specific API key requirements
- [ ] Add setup to team wiki/knowledge base

### Access Management
- [ ] Grant team members access to Google Cloud project (if needed)
- [ ] Share development API keys securely (1Password, etc.)
- [ ] Do NOT share production keys via insecure channels
- [ ] Document key rotation procedures

## Maintenance

### Regular Tasks
- [ ] Review API usage monthly
- [ ] Rotate API keys every 90 days
- [ ] Update documentation if process changes
- [ ] Review and update key restrictions as needed
- [ ] Monitor for security alerts from Google Cloud

### Security Audits
- [ ] Quarterly: Review all active API keys
- [ ] Quarterly: Verify key restrictions are still in place
- [ ] Quarterly: Check for any exposed keys (GitHub, logs, etc.)
- [ ] Annually: Full security review of API key management

## Troubleshooting

If something goes wrong:
- [ ] Check [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md) troubleshooting section
- [ ] Run `npm run env:check` to diagnose issues
- [ ] Verify API keys are not expired or restricted incorrectly
- [ ] Check Google Cloud Console quota and billing
- [ ] Review app logs for specific error messages

## Final Verification

Before considering the implementation complete:
- [ ] All environment files properly configured
- [ ] All security checks passing
- [ ] Maps working in development
- [ ] Maps working in staging builds
- [ ] EAS secrets configured for all environments
- [ ] CI/CD pipelines working
- [ ] Team members onboarded
- [ ] Documentation reviewed and approved
- [ ] No API keys committed to Git (verify with `git log -p`)

---

**Implementation Date**: _______________

**Implemented By**: _______________

**Reviewed By**: _______________

**Production Deployment Date**: _______________

---

## Notes
(Add any project-specific notes, issues encountered, or lessons learned)

_______________________________________________________________________________

_______________________________________________________________________________

_______________________________________________________________________________

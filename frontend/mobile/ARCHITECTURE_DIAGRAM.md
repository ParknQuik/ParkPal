# Google Maps API Key Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ParknQuik Mobile App                        │
│                    (React Native + Expo)                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Uses
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         app.config.js                               │
│                  (Loads environment variables)                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │                           │
          ┌─────────▼─────────┐       ┌────────▼────────┐
          │  Local Development │       │   EAS Builds    │
          │    Environment     │       │  (Staging/Prod) │
          └─────────┬─────────┘       └────────┬────────┘
                    │                           │
                    │                           │
          ┌─────────▼─────────┐       ┌────────▼────────┐
          │    .env.local     │       │   EAS Secrets   │
          │  (gitignored)     │       │   (encrypted)   │
          │                   │       │                 │
          │ ✓ Your API keys   │       │ ✓ Staging keys  │
          │ ✓ Local IP        │       │ ✓ Prod keys     │
          │ ✓ Not committed   │       │ ✓ Secure        │
          └───────────────────┘       └─────────────────┘
```

## Environment Variable Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    Environment Loading Order                      │
└──────────────────────────────────────────────────────────────────┘

1. .env.development    (committed, placeholders)
         │
         ▼
2. .env.local          (gitignored, YOUR ACTUAL KEYS)
         │
         ▼
3. .env                (gitignored, alternative to .env.local)
         │
         ▼
   Used by app.config.js
         │
         ▼
   Injected into iOS/Android apps
```

## File Structure

```
frontend/mobile/
│
├── 📄 app.config.js                    # Main config (replaces app.json)
│   └── Loads environment variables from .env files
│
├── 📋 Configuration Files
│   ├── .env.example                    # Template (COMMITTED ✓)
│   ├── .env.development                # Dev defaults (COMMITTED ✓)
│   ├── .env.staging                    # Staging defaults (COMMITTED ✓)
│   ├── .env.production                 # Prod defaults (COMMITTED ✓)
│   ├── .env.local                      # Your keys (GITIGNORED 🔒)
│   └── eas.json                        # EAS build config (COMMITTED ✓)
│
├── 📚 Documentation
│   ├── GOOGLE_MAPS_SETUP.md            # Complete setup guide
│   ├── QUICK_START.md                  # 5-minute onboarding
│   ├── ENV_SETUP_README.md             # Quick reference
│   ├── IMPLEMENTATION_CHECKLIST.md     # Full checklist
│   ├── GOOGLE_MAPS_IMPLEMENTATION_SUMMARY.md  # This implementation
│   └── ARCHITECTURE_DIAGRAM.md         # This file
│
├── 🔧 Scripts
│   ├── scripts/check-env.js            # Validate environment
│   └── scripts/setup-eas-secrets.sh    # Setup EAS secrets
│
└── 🔒 Security
    ├── .gitignore                      # Protects .env files
    └── .github/workflows/
        ├── mobile-env-check.yml        # Security checks
        └── mobile-eas-build.yml        # Automated builds
```

## Environment Separation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT ENVIRONMENT                          │
├─────────────────────────────────────────────────────────────────────┤
│ Source:      .env.local (gitignored)                                │
│ API Keys:    Development Google Maps keys                           │
│ Backend:     http://192.168.x.x:3001/api/v1 (local IP)             │
│ Use Case:    Individual developer machines                          │
│ Security:    Keys not committed, each dev has own copy              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    STAGING ENVIRONMENT                              │
├─────────────────────────────────────────────────────────────────────┤
│ Source:      EAS Secrets (encrypted)                                │
│ API Keys:    Staging Google Maps keys                               │
│ Backend:     https://staging-api.parknquik.com/api/v1              │
│ Use Case:    Internal testing builds                                │
│ Security:    Keys stored in EAS, not in repository                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                           │
├─────────────────────────────────────────────────────────────────────┤
│ Source:      EAS Secrets (encrypted)                                │
│ API Keys:    Production Google Maps keys (strict restrictions)      │
│ Backend:     https://api.parknquik.com/api/v1                      │
│ Use Case:    App Store / Play Store releases                        │
│ Security:    Maximum restrictions, monitored, rotated quarterly     │
└─────────────────────────────────────────────────────────────────────┘
```

## API Key Security Model

```
┌──────────────────────────────────────────────────────────────────┐
│                    Google Cloud Console                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Production Project                            │ │
│  │                                                            │ │
│  │  ┌──────────────────┐      ┌──────────────────┐          │ │
│  │  │  iOS API Key     │      │ Android API Key  │          │ │
│  │  │                  │      │                  │          │ │
│  │  │ Restricted to:   │      │ Restricted to:   │          │ │
│  │  │ ✓ Bundle ID      │      │ ✓ Package name   │          │ │
│  │  │ ✓ Maps SDK iOS   │      │ ✓ SHA-1 cert     │          │ │
│  │  │ ✓ Places API     │      │ ✓ Maps SDK Andr. │          │ │
│  │  │ ✓ Geocoding API  │      │ ✓ Places API     │          │ │
│  │  └──────────────────┘      └──────────────────┘          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Staging Project (separate)                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Development Project (separate)                │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Developer Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                      NEW DEVELOPER SETUP                        │
└─────────────────────────────────────────────────────────────────┘

Step 1: Clone Repository
   │
   ▼
Step 2: Install Dependencies
   │   $ npm install
   ▼
Step 3: Create .env.local
   │   $ cp .env.example .env.local
   ▼
Step 4: Get API Keys
   │   • Ask team lead for dev keys, OR
   │   • Create own keys in Google Cloud
   ▼
Step 5: Add Keys to .env.local
   │   GOOGLE_MAPS_API_KEY_IOS=your_key
   │   GOOGLE_MAPS_API_KEY_ANDROID=your_key
   ▼
Step 6: Validate Setup
   │   $ npm run env:check
   ▼
Step 7: Start Development
   │   $ npm start
   ▼
   ✅ Ready to develop!
```

## Build Process Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      LOCAL DEVELOPMENT                          │
└─────────────────────────────────────────────────────────────────┘

Developer runs: npm start
         │
         ▼
app.config.js loads .env.local
         │
         ▼
Environment variables injected
         │
         ▼
Expo starts with API keys
         │
         ▼
Maps work in app!


┌─────────────────────────────────────────────────────────────────┐
│                      EAS BUILD (Production)                     │
└─────────────────────────────────────────────────────────────────┘

Developer runs: npm run build:prod:ios
         │
         ▼
EAS CLI connects to Expo servers
         │
         ▼
Fetches secrets from EAS
         │
         ▼
Injects secrets as env variables
         │
         ▼
app.config.js uses EAS secrets
         │
         ▼
Native app built with production keys
         │
         ▼
Submitted to App Store
```

## CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    GITHUB PULL REQUEST                          │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────┐
         │  mobile-env-check.yml     │
         │  (GitHub Actions)         │
         └───────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    Check for      Scan for      Verify
    .env files    hardcoded    .gitignore
    in Git          keys        is correct
         │               │               │
         └───────────────┼───────────────┘
                         ▼
                  ✅ All Checks Pass
                         │
                         ▼
                 PR can be merged


┌─────────────────────────────────────────────────────────────────┐
│                    PUSH TO MAIN BRANCH                          │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────┐
         │  mobile-eas-build.yml     │
         │  (GitHub Actions)         │
         └───────────────────────────┘
                         │
                         ▼
              Trigger EAS Build
                         │
                         ▼
           Use EAS Secrets for keys
                         │
                         ▼
          Build iOS and Android apps
                         │
                         ▼
         ✅ Production builds ready
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY PROTECTION LAYERS                   │
└─────────────────────────────────────────────────────────────────┘

Layer 1: .gitignore
    │   Prevents .env files from being committed
    ▼

Layer 2: GitHub Actions (mobile-env-check.yml)
    │   Scans for accidentally committed keys
    │   Blocks PRs that contain .env files
    ▼

Layer 3: API Key Restrictions (Google Cloud)
    │   iOS: Only works with specific bundle ID
    │   Android: Only works with package name + SHA-1
    │   APIs: Only Maps SDK, Places, Geocoding
    ▼

Layer 4: EAS Secrets
    │   Production keys stored encrypted
    │   Not accessible from repository
    │   Only used during builds
    ▼

Layer 5: Monitoring
    │   Quota limits prevent runaway usage
    │   Billing alerts for unexpected costs
    │   Regular key rotation (quarterly)
    ▼

    ✅ Multiple layers of protection
```

## Quick Reference Commands

```
┌─────────────────────────────────────────────────────────────────┐
│                      USEFUL COMMANDS                            │
└─────────────────────────────────────────────────────────────────┘

Setup & Validation:
  npm install                  Install dependencies
  npm run env:check            Validate environment setup
  npm run setup:eas            Configure EAS secrets

Development:
  npm start                    Start development server
  npm run start:dev            Start with dev environment
  npm run ios                  Run on iOS simulator
  npm run android              Run on Android emulator

Building:
  npm run build:dev:ios        Build development iOS
  npm run build:dev:android    Build development Android
  npm run build:staging:ios    Build staging iOS
  npm run build:prod:ios       Build production iOS
  npm run build:prod:android   Build production Android

EAS:
  eas login                    Login to Expo
  eas secret:list              List all secrets
  eas build --profile production   Manual production build

Git:
  git status                   Check for uncommitted files
  git log -p | grep -i "api"   Search history for API keys
```

## File Permissions

```
┌─────────────────────────────────────────────────────────────────┐
│                    FILE COMMIT STATUS                           │
└─────────────────────────────────────────────────────────────────┘

✅ COMMITTED (safe to commit - no real keys)
   app.config.js
   eas.json
   .env.example
   .env.development
   .env.staging
   .env.production
   package.json
   .gitignore
   All documentation (.md files)
   All scripts (.js, .sh files)

🔒 GITIGNORED (never commit - contains real keys)
   .env
   .env.local
   .env*.local
   node_modules/
   .expo/
```

## Summary

This architecture provides:

✅ **Separation of Concerns**
   - Development keys separate from production
   - Local development separate from builds

✅ **Security by Default**
   - Multiple layers of protection
   - Automated checks prevent mistakes
   - Restricted API keys

✅ **Developer Friendly**
   - Simple setup process
   - Clear documentation
   - Helpful validation scripts

✅ **Production Ready**
   - Secure secret management
   - Automated builds
   - Monitoring and alerts

---

**For more details, see:**
- [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md) - Complete setup guide
- [QUICK_START.md](./QUICK_START.md) - Quick onboarding
- [GOOGLE_MAPS_IMPLEMENTATION_SUMMARY.md](./GOOGLE_MAPS_IMPLEMENTATION_SUMMARY.md) - Implementation details

# Backend Configuration - Hybrid Approach

**Last Updated:** March 15, 2026

**🎯 Zero-configuration backend connection** using smart platform detection + mDNS for physical devices.

---

## 🚀 Quick Start (New Developers)

### Step 1: Setup Environment File

```bash
cd frontend/mobile
cp .env.local.example .env.local
```

### Step 2: Configure for Physical Device (Optional)

**Only needed if testing on physical Android/iOS device:**

```bash
# Get your Mac's hostname
hostname
# Example output: Bryans-MacBook-Air.local

# Edit .env.local and set (without .local suffix):
EXPO_PUBLIC_BACKEND_HOSTNAME=Bryans-MacBook-Air
```

### Step 3: Start Development

```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start mobile app
cd frontend/mobile && npm start
```

**That's it!** The app automatically connects to the right backend:
- ✅ **iOS Simulator**: `localhost:3001` (automatic)
- ✅ **Android Emulator**: `10.0.2.2:3001` (automatic)
- ✅ **Physical Device**: `[YOUR-HOSTNAME].local:3001` (via mDNS)

---

## 🎯 How It Works - Hybrid Approach

The app **automatically detects** which backend to use:

### Configuration Priority

1. **EXPO_PUBLIC_API_URL** (manual override) - Highest priority
2. **EXPO_PUBLIC_BACKEND_HOSTNAME** (mDNS for physical devices)
3. **Smart platform detection** (automatic for simulators/emulators)
4. **Deployed backend** (production builds only)

### Platform Detection Logic

```
Are you using EXPO_PUBLIC_API_URL override?
├─ YES → Use that URL (manual override)
└─ NO → Detect platform:
    ├─ iOS Simulator → http://localhost:3001/api/v1
    ├─ Android Emulator → http://10.0.2.2:3001/api/v1
    └─ Physical Device → http://[HOSTNAME].local:3001/api/v1
```

### Why mDNS (.local) for Physical Devices?

| Approach | IP Address | mDNS (.local) |
|----------|-----------|---------------|
| **Works when IP changes** | ❌ Breaks | ✅ Always works |
| **Configuration** | Manual IP update | Set hostname once |
| **Team friendly** | Each dev different IP | Each dev their hostname |
| **Example** | `192.168.1.100` | `Bryans-MacBook-Air.local` |

---

## 👥 Team Setup (Multiple Developers)

Each developer needs to:

1. **Copy environment file**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Find their Mac's hostname**:
   ```bash
   hostname
   # Output: Johns-MacBook-Pro.local
   ```

3. **Set in `.env.local`** (without `.local` suffix):
   ```bash
   EXPO_PUBLIC_BACKEND_HOSTNAME=Johns-MacBook-Pro
   ```

4. **Add API keys**:
   ```bash
   GOOGLE_MAPS_API_KEY_IOS=your_ios_key
   GOOGLE_MAPS_API_KEY_ANDROID=your_android_key
   ```

**No IP addresses to manage!** Each developer's setup works independently.

---

## Common Scenarios

### Scenario 1: Daily Development (No Config)

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend/mobile && npm start
# Press 'i' for iOS or 'a' for Android
```

✅ **Works automatically** - Uses platform defaults

### Scenario 2: Testing on Physical Device

Find your machine's IP:
```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I

# Windows
ipconfig
```

Add to `.env.local`:
```bash
EXPO_PUBLIC_API_URL=http://192.168.100.221:3001/api/v1
```

### Scenario 3: Testing Against Deployed Backend

Uncomment in `.env.local`:
```bash
EXPO_PUBLIC_API_URL=https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api/v1
```

### Scenario 4: Production Build

Production builds automatically use deployed backend.

```bash
# EAS Build automatically uses deployed backend
eas build --platform ios --profile production
```

---

## Visual Indicator

The app shows which backend you're connected to:

- **🏠 Green badge** = Local backend (localhost, 10.0.2.2, or 192.168.x.x)
- **☁️ Blue badge** = Deployed backend

**Tap to expand** and see full URL.

---

## Configuration Files

### 1. `.env.local` (Not committed)

Your personal environment variables:

```bash
# Leave all commented for defaults
# Uncomment to override:

# Local development
# EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1

# Physical device
# EXPO_PUBLIC_API_URL=http://192.168.100.221:3001/api/v1

# Deployed backend
# EXPO_PUBLIC_API_URL=https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api/v1
```

### 2. `src/config/api.config.ts`

Central configuration module:

```typescript
import { API_BASE_URL, isLocalBackend } from '../config/api.config';

// Current backend URL
console.log(API_BASE_URL);

// Check if local
console.log(isLocalBackend()); // true/false
```

### 3. `src/services/api.ts`

Axios instance using the configuration:

```typescript
import api from '../services/api';

// All API calls use configured backend
const response = await api.get('/auth/me');
```

---

## Troubleshooting

### "Network request failed" on iOS

**Cause:** Backend not running

**Fix:**
```bash
cd backend && npm run dev
```

### "Network request failed" on Android

**Cause 1:** Using `localhost` instead of `10.0.2.2`

**Fix:** Leave `.env.local` commented (uses platform defaults)

**Cause 2:** Backend not running

**Fix:**
```bash
cd backend && npm run dev
```

### "Network request failed" on Physical Device

**Cause 1:** Not on same Wi-Fi network

**Fix:** Connect phone to same Wi-Fi as your computer

**Cause 2:** Wrong IP address

**Fix:**
```bash
# Get correct IP
ipconfig getifaddr en0

# Update .env.local
EXPO_PUBLIC_API_URL=http://[YOUR_IP]:3001/api/v1
```

**Cause 3:** Firewall blocking port 3001

**Fix:** Allow incoming connections on port 3001

### App shows ☁️ instead of 🏠

**Cause:** App thinks it's using deployed backend

**Check:**
1. Is `EXPO_PUBLIC_API_URL` set in `.env.local`?
   - If yes: Is it the local URL?
   - If no: Restart app

2. Console logs at app start:
   ```
   📡 API Configuration:
     Base URL: http://localhost:3001/api/v1
     Backend: 🏠 Local
   ```

---

## Best Practices

1. ✅ **Leave `.env.local` mostly empty**
   - Platform defaults work for 90% of development
   - Only set when testing specific scenarios

2. ✅ **Use deployed backend for testing rate limits**
   - Deployed backend has real rate limits (5 login attempts / 15 min)
   - Local backend has no rate limits

3. ✅ **Never commit `.env.local`**
   - Already in `.gitignore`
   - Contains machine-specific IPs

4. ✅ **Monitor the backend indicator**
   - Quick visual confirmation
   - Prevents confusion during testing

5. ✅ **Restart app after changing `.env.local`**
   - Metro bundler caches environment variables
   - Use `npm start -- --clear` to clear cache

---

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `EXPO_PUBLIC_API_URL` | Override backend URL | `http://localhost:3001/api/v1` |
| `EXPO_PUBLIC_ENV` | Environment name | `development` |
| `GOOGLE_MAPS_API_KEY_IOS` | Google Maps (iOS) | `AIzaSy...` |
| `GOOGLE_MAPS_API_KEY_ANDROID` | Google Maps (Android) | `AIzaSy...` |

---

## Related Files

- `src/config/api.config.ts` - Configuration logic
- `src/services/api.ts` - Axios instance
- `.env.local` - Local environment variables (not committed)
- `.env.development` - Development defaults (committed)
- `app.config.js` - Expo configuration
- `src/components/DevModeIndicator.tsx` - Visual indicator

---

**Status:** ✅ Production Ready
**Approach:** Simple environment variables (industry standard)
**Last Updated:** March 14, 2026

# Google Maps Setup

Covers API key setup for both the mobile app (React Native/Expo) and the web app (Vite/React).

---

## Step 1: Create a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Go to **APIs & Services → Library**
4. Enable:
   - **Maps JavaScript API** (web)
   - **Maps SDK for Android** (mobile)
   - **Maps SDK for iOS** (mobile)
5. Go to **APIs & Services → Credentials → Create Credentials → API Key**
6. Copy the key and optionally restrict it by platform/referrer

---

## Mobile App Setup (React Native/Expo)

### Local Development

```bash
cd frontend/mobile
cp .env.example .env.local
```

Edit `.env.local`:
```bash
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3001/api/v1
GOOGLE_MAPS_API_KEY_IOS=your_ios_key_here
GOOGLE_MAPS_API_KEY_ANDROID=your_android_key_here
```

Start the app:
```bash
npm start
```

### How the Mobile App Gets the Key

The mobile app does **not** store the Maps API key directly. It fetches it from the backend at runtime:

```typescript
import mapsConfig from './services/mapsConfig';
const apiKey = await mapsConfig.getApiKey(); // cached 24 hours
```

Backend endpoint: `GET /api/v1/config/maps-api-key` (requires auth)  
The backend retrieves the key from GCP Secret Manager (secret name: `google-maps-api-key`).

### EAS Build Configuration

For production EAS builds, add to `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "GOOGLE_MAPS_API_KEY_IOS": "your_ios_key",
        "GOOGLE_MAPS_API_KEY_ANDROID": "your_android_key"
      }
    }
  }
}
```

### CI/CD Pipeline

Add `GOOGLE_MAPS_API_KEY` as a GitHub secret, then reference it in your workflow:
```yaml
env:
  GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_MAPS_API_KEY }}
```

---

## Web App Setup (Vite/React)

### Local Development

```bash
cd frontend/web
cp .env.local.example .env.local
```

Edit `.env.local`:
```bash
VITE_GOOGLE_MAPS_API_KEY=AIzaSyC-xxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_API_URL=http://localhost:3001
```

Restart the dev server:
```bash
npm run dev
```

### Production

The key is baked into the Docker build via GitHub Actions. Set `VITE_GOOGLE_MAPS_API_KEY` as a GitHub Actions secret. The workflow passes it as a build arg:
```yaml
--build-arg VITE_GOOGLE_MAPS_API_KEY=${{ secrets.VITE_GOOGLE_MAPS_API_KEY }}
```

---

## Troubleshooting

**Map shows grey/blank:** API key is missing or incorrect. Check `.env.local` and restart the server.

**"This page can't load Google Maps correctly":** API key is invalid or the Maps JavaScript API is not enabled for that key.

**Mobile map not loading:** Backend must be running and user must be authenticated for the key fetch to work. Check network connectivity.

**"REQUEST_DENIED" error:** The API key is restricted and your domain/bundle ID is not in the allowed list. Update restrictions in GCP Console.

**Key not found in Secret Manager:** Run `gcloud secrets describe google-maps-api-key` to verify it exists. See `docs/GCP_SECRET_MANAGER.md` for setup.

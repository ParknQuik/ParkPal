# Quick Start Guide - ParknQuik Mobile

New to the project? Get up and running in 5 minutes!

## Prerequisites
- Node.js 18+ installed
- npm or yarn
- iOS Simulator (Mac) or Android Emulator
- Google Maps API keys (see below)

## Step 1: Clone & Install
```bash
# Clone the repository (if you haven't already)
git clone https://github.com/your-org/parkpal.git
cd parkpal/frontend/mobile

# Install dependencies
npm install
```

## Step 2: Configure Environment
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your actual values
# (Ask your team lead for API keys if you don't have them)
nano .env.local
```

**Minimum required in .env.local**:
```bash
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3001/api/v1
GOOGLE_MAPS_API_KEY_IOS=your_ios_key_here
GOOGLE_MAPS_API_KEY_ANDROID=your_android_key_here
```

### How to Find Your Local IP:
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig

# Look for something like: 192.168.1.100
# Then use: http://192.168.1.100:3001/api/v1
```

## Step 3: Get Google Maps API Keys

### Option A: Use Team Development Keys (Quickest)
Ask your team lead for the shared development API keys. Add them to your `.env.local` file.

### Option B: Create Your Own Keys (Recommended for Active Development)
Follow the detailed guide in [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md)

**Quick version**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or use existing: `parknquik-mobile-dev`
3. Enable APIs:
   - Maps SDK for iOS
   - Maps SDK for Android
   - Places API
   - Geocoding API
4. Create API Key → Restrict to:
   - iOS: Bundle ID `com.parknquik.mobile`
   - Android: Package name `com.parknquik.mobile` + your SHA-1
5. Copy keys to `.env.local`

## Step 4: Start Backend (Required)
The mobile app needs the backend API running:

```bash
# In a new terminal, navigate to backend
cd ../../backend

# Install dependencies (first time only)
npm install

# Start the backend
npm run dev

# Backend should be running on http://localhost:3001
```

## Step 5: Start Mobile App
```bash
# Back in frontend/mobile directory
npm start

# Then:
# - Press 'i' for iOS Simulator
# - Press 'a' for Android Emulator
# - Or scan QR code with Expo Go app on your phone
```

## Verification Checklist
- [ ] Backend is running on port 3001
- [ ] Mobile app starts without errors
- [ ] You can see the login/home screen
- [ ] Maps load correctly (not gray screen)
- [ ] No "Missing environment variables" errors

## Common Issues

### "Missing required environment variables"
**Fix**: Ensure `.env.local` exists and has all required variables

### Maps show gray screen
**Fix**:
1. Check API keys are correct in `.env.local`
2. Verify APIs are enabled in Google Cloud Console
3. Restart app: `npx expo start --clear`

### "Cannot connect to backend"
**Fix**:
1. Ensure backend is running: `cd ../../backend && npm run dev`
2. Check your local IP is correct in `EXPO_PUBLIC_API_URL`
3. Use local IP (192.168.x.x), not `localhost` (won't work on device/emulator)

### "Network request failed"
**Fix**: Ensure phone/emulator is on the same WiFi network as your computer

## Project Structure
```
frontend/mobile/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # App screens
│   ├── navigation/     # Navigation setup
│   ├── redux/          # State management
│   └── utils/          # Helper functions
├── assets/             # Images, fonts, etc.
├── app.config.js       # Expo configuration (uses .env variables)
├── .env.local          # Your personal environment variables (NOT committed)
├── .env.example        # Template for environment variables
└── package.json        # Dependencies
```

## Development Workflow

### Making Changes
1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Test on iOS and Android
4. Commit: `git commit -m "feat: your feature description"`
5. Push: `git push origin feat/your-feature`
6. Create Pull Request on GitHub

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch
```

### Building for Production
```bash
# Install EAS CLI (first time only)
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production
```

## Need Help?

1. **Read the docs**:
   - [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md) - Detailed API key setup
   - [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Project status and architecture

2. **Check existing issues**: Search the GitHub repository

3. **Ask the team**:
   - Slack: `#mobile-dev`
   - Email: tech@parknquik.com

4. **Common Commands**:
   ```bash
   npm start                    # Start development server
   npm start -- --clear         # Clear cache and start
   npm run ios                  # Start on iOS
   npm run android              # Start on Android
   npx expo doctor              # Check for issues
   npx expo install --check     # Check dependency versions
   ```

## Next Steps

Once you're up and running:
- [ ] Read [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for architecture overview
- [ ] Review the current sprint tasks in GitHub Projects
- [ ] Join the team standup (daily at 10am)
- [ ] Introduce yourself in `#mobile-dev` Slack channel

**Welcome to the team!** 🚀

---

**Last Updated**: 2025-12-15

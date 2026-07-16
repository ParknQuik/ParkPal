# Google Sign-In Setup for ParkPal Mobile

**Last Updated:** June 1, 2026
**Status:** Native Google Sign-In for Expo development builds and standalone builds.

## Current State

- Mobile uses `@react-native-google-signin/google-signin`.
- Expo Go is not supported for Google sign-in because this is a native module.
- The mobile app sends Google's `idToken` to `POST /api/v1/auth/google`.
- The backend verifies the token audience with `GOOGLE_CLIENT_ID`.
- Legacy `{ code }` requests remain supported by the backend for backward compatibility.

## Required Environment Variables

### Mobile

```bash
# Web OAuth client ID used by mobile and backend audience verification.
EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_WEB_OAUTH_CLIENT_ID.apps.googleusercontent.com

# iOS OAuth client ID for bundle ID com.parknquik.mobile.
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_OAUTH_CLIENT_ID.apps.googleusercontent.com

# Reversed iOS client ID URL scheme.
GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.YOUR_REVERSED_IOS_CLIENT_ID
```

### Backend

```bash
# Must match frontend/mobile EXPO_PUBLIC_GOOGLE_CLIENT_ID.
GOOGLE_CLIENT_ID=YOUR_WEB_OAUTH_CLIENT_ID.apps.googleusercontent.com

# Legacy browser OAuth code exchange compatibility only.
GOOGLE_CLIENT_SECRET=YOUR_WEB_OAUTH_CLIENT_SECRET
GOOGLE_REDIRECT_URI=parknquik://
```

## Google Cloud OAuth Clients

Create or verify these OAuth clients in Google Cloud Console:

1. Web client
   - Used by the backend as the accepted token audience.
   - Copy this client ID into mobile `EXPO_PUBLIC_GOOGLE_CLIENT_ID` and backend `GOOGLE_CLIENT_ID`.

2. iOS client
   - Bundle ID: `com.parknquik.mobile`
   - Copy the client ID into `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
   - Copy the reversed client ID URL scheme into `GOOGLE_IOS_URL_SCHEME`.

3. Android client
   - Package name: `com.parknquik.mobile`
   - SHA-1: use the Expo development-build or release keystore SHA-1 for the build being tested.
   - Android does not need an app config entry beyond the package name and the native module setup.

## Build and Test

Build a development client after changing native configuration:

```bash
npm run build:dev:ios
npm run build:dev:android
```

For local backend testing, start the backend on the default local API target:

```bash
cd ../../backend
npm run dev
```

Then run the installed Expo development build, tap **Continue with Google**, choose an account, and confirm the app lands in the authenticated experience. Relaunch the app to confirm session restoration.

## Request Contract

Canonical mobile request:

```json
{
  "googleToken": "<Google id_token>"
}
```

Legacy backend-compatible request:

```json
{
  "code": "<authorization_code>"
}
```

Successful response:

```json
{
  "token": "<ParkPal JWT>",
  "user": {
    "id": "user-id",
    "name": "Google User",
    "email": "google@example.com",
    "role": "driver"
  }
}
```

## Troubleshooting

- **Native module missing:** rebuild and reinstall the Expo development client. Expo Go cannot load this module.
- **Invalid Google token:** confirm backend `GOOGLE_CLIENT_ID` matches mobile `EXPO_PUBLIC_GOOGLE_CLIENT_ID`.
- **iOS callback fails:** confirm `GOOGLE_IOS_URL_SCHEME` is the reversed iOS client ID and appears in the built app.
- **Android sign-in fails:** confirm the Android OAuth client uses package `com.parknquik.mobile` and the SHA-1 for the installed build.

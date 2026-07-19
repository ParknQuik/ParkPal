/**
 * Expo App Configuration
 *
 * This file replaces app.json to enable dynamic configuration
 * with environment variables. Environment variables are loaded
 * from .env files using dotenv.
 *
 * Environment Variables:
 * - EXPO_PUBLIC_API_URL: Backend API URL
 * - EXPO_PUBLIC_GOOGLE_CLIENT_ID: Web OAuth client ID for Google Sign-In
 * - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: iOS OAuth client ID for Google Sign-In
 * - GOOGLE_IOS_URL_SCHEME: Reversed iOS OAuth client ID URL scheme
 * - GOOGLE_MAPS_API_KEY_IOS: Google Maps API key for iOS
 * - GOOGLE_MAPS_API_KEY_ANDROID: Google Maps API key for Android
 * - FACEBOOK_APP_ID: Facebook app ID for native Facebook Login
 * - FACEBOOK_CLIENT_TOKEN: Facebook client token for native Facebook Login
 * - FACEBOOK_DISPLAY_NAME: Facebook display name
 * - EXPO_PUBLIC_ENV: Environment name (development, staging, production)
 */

// Load environment variables from .env.local (priority) then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const ENV = process.env.EXPO_PUBLIC_ENV || 'development';
const IS_EAS_BUILD = process.env.EAS_BUILD === 'true';
const GOOGLE_IOS_URL_SCHEME =
  process.env.GOOGLE_IOS_URL_SCHEME ||
  'com.googleusercontent.apps.YOUR_REVERSED_IOS_CLIENT_ID';
const FACEBOOK_APP_ID =
  process.env.FACEBOOK_APP_ID ||
  process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ||
  'YOUR_FACEBOOK_APP_ID';
const FACEBOOK_CLIENT_TOKEN =
  process.env.FACEBOOK_CLIENT_TOKEN ||
  process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN ||
  'YOUR_FACEBOOK_CLIENT_TOKEN';
const FACEBOOK_DISPLAY_NAME = process.env.FACEBOOK_DISPLAY_NAME || 'ParknQuik';

const hasModule = (moduleName) => {
  try {
    require.resolve(moduleName);
    return true;
  } catch {
    return false;
  }
};

const hasConfiguredFacebook =
  FACEBOOK_APP_ID &&
  FACEBOOK_CLIENT_TOKEN &&
  !FACEBOOK_APP_ID.includes('YOUR_FACEBOOK_APP_ID') &&
  !FACEBOOK_CLIENT_TOKEN.includes('YOUR_FACEBOOK_CLIENT_TOKEN');

const nativeAuthPlugins = [];
if (hasModule('expo-apple-authentication')) {
  nativeAuthPlugins.push('expo-apple-authentication');
}
if (hasModule('react-native-fbsdk-next') && hasConfiguredFacebook) {
  nativeAuthPlugins.push([
    'react-native-fbsdk-next',
    {
      appID: FACEBOOK_APP_ID,
      clientToken: FACEBOOK_CLIENT_TOKEN,
      displayName: FACEBOOK_DISPLAY_NAME,
      scheme: `fb${FACEBOOK_APP_ID}`,
    },
  ]);
}

// Validate required environment variables (only Google Maps keys)
// EXPO_PUBLIC_API_URL is optional - will use platform defaults if not set
const requiredEnvVars = {
  GOOGLE_MAPS_API_KEY_IOS: process.env.GOOGLE_MAPS_API_KEY_IOS,
  GOOGLE_MAPS_API_KEY_ANDROID: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
};

const isConfiguredMapsValue = (value) =>
  value && !value.includes('YOUR_');

const googleSignInEnvVars = {
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  GOOGLE_IOS_URL_SCHEME: process.env.GOOGLE_IOS_URL_SCHEME,
};

const isConfiguredGoogleSignInValue = (value) =>
  value &&
  !value.includes('YOUR_WEB_OAUTH_CLIENT_ID') &&
  !value.includes('YOUR_IOS_OAUTH_CLIENT_ID') &&
  !value.includes('YOUR_REVERSED_IOS_CLIENT_ID');

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !isConfiguredMapsValue(value))
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('\n❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  if (IS_EAS_BUILD) {
    console.error('\n📝 Configure these in EAS environment variables for this build profile, then rebuild.\n');
  } else {
    console.error('\n📝 Please add these to .env.local\n');
  }

  // For development, we'll use placeholder values with a warning
  if (ENV === 'development' && !IS_EAS_BUILD) {
    console.warn('⚠️  Using placeholder values for local development. Maps functionality will not work.\n');
  } else {
    throw new Error('Missing required environment variables');
  }
}

const missingGoogleSignInVars = Object.entries(googleSignInEnvVars)
  .filter(([, value]) => !isConfiguredGoogleSignInValue(value))
  .map(([key]) => key);

if (missingGoogleSignInVars.length > 0) {
  console.warn('\n⚠️  Missing Google Sign-In environment variables:');
  missingGoogleSignInVars.forEach(varName => {
    console.warn(`   - ${varName}`);
  });
  console.warn('   Native Google Sign-In will not work until these are configured.\n');

  if (ENV !== 'development') {
    throw new Error('Missing Google Sign-In environment variables');
  }
}

module.exports = {
  expo: {
    name: 'ParknQuik',
    slug: 'parknquik-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',

    // Expose environment variables to the app via expo-constants
    extra: {
      // API URL is optional - src/config/api.config.ts will use platform defaults if not set
      apiUrl: process.env.EXPO_PUBLIC_API_URL || undefined,
      environment: ENV,
      facebook: {
        appId: FACEBOOK_APP_ID,
        clientToken: FACEBOOK_CLIENT_TOKEN,
      },
      // EAS Build will provide this automatically
      eas: {
        projectId: process.env.EAS_PROJECT_ID || '9d33320e-1433-4dbb-a8a9-247ab2a84f6f',
      },
    },

    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#667eea',
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.parknquik.mobile',
      usesAppleSignIn: true,
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS || 'YOUR_IOS_API_KEY_HERE',
      },
    },

    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#667eea',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.parknquik.mobile',
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
      ],
      usesCleartextTraffic: ENV === 'development', // Only for development
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID || 'YOUR_ANDROID_API_KEY_HERE',
        },
      },
    },

    web: {
      favicon: './assets/favicon.png',
    },

    scheme: 'parknquik',

    plugins: [
      'expo-location',
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow ParknQuik to access your photos to upload parking spot images.',
        },
      ],
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: GOOGLE_IOS_URL_SCHEME,
        },
      ],
      ...nativeAuthPlugins,
    ],
  },
};

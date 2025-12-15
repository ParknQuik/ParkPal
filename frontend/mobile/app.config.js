/**
 * Expo App Configuration
 *
 * This file replaces app.json to enable dynamic configuration
 * with environment variables. Environment variables are loaded
 * from .env files using dotenv.
 *
 * Environment Variables:
 * - EXPO_PUBLIC_API_URL: Backend API URL
 * - GOOGLE_MAPS_API_KEY_IOS: Google Maps API key for iOS
 * - GOOGLE_MAPS_API_KEY_ANDROID: Google Maps API key for Android
 * - EXPO_PUBLIC_ENV: Environment name (development, staging, production)
 */

// Load environment variables from .env file
require('dotenv').config();

const ENV = process.env.EXPO_PUBLIC_ENV || 'development';

// Validate required environment variables
const requiredEnvVars = {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  GOOGLE_MAPS_API_KEY_IOS: process.env.GOOGLE_MAPS_API_KEY_IOS,
  GOOGLE_MAPS_API_KEY_ANDROID: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('\n❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📝 Please copy .env.example to .env and fill in your values.\n');

  // For development, we'll use placeholder values with a warning
  if (ENV === 'development') {
    console.warn('⚠️  Using placeholder values for development. Maps functionality will not work.\n');
  } else {
    throw new Error('Missing required environment variables');
  }
}

module.exports = {
  expo: {
    name: 'ParknQuik',
    slug: 'parknquik-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',

    // Expose environment variables to the app via expo-constants
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.176:3001/api/v1',
      environment: ENV,
      // EAS Build will provide this automatically
      eas: {
        projectId: process.env.EAS_PROJECT_ID || undefined,
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

    plugins: [
      'expo-location',
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow ParknQuik to access your photos to upload parking spot images.',
        },
      ],
    ],
  },
};

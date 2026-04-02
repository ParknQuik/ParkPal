import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * API Configuration - Hybrid Approach
 *
 * Automatic backend detection with zero configuration:
 * - iOS Simulator: localhost (auto-works)
 * - Android Emulator: 10.0.2.2 (auto-works)
 * - Physical Devices: mDNS .local hostname (works across IP changes)
 *
 * Override with EXPO_PUBLIC_API_URL in .env.local if needed
 */

// Deployed backend URLs
export const DEPLOYED_BACKEND_DEV = 'https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api/v1';
export const DEPLOYED_BACKEND_STAGING = 'https://parkpal-backend-staging-cxntrkjjmq-as.a.run.app/api/v1';
export const DEPLOYED_BACKEND_PROD = 'https://parkpal-backend-prod-cxntrkjjmq-as.a.run.app/api/v1';

// Local backend URLs (platform-specific)
export const LOCAL_BACKEND_IOS_SIMULATOR = 'http://localhost:3001/api/v1';
export const LOCAL_BACKEND_ANDROID_EMULATOR = 'http://10.0.2.2:3001/api/v1';

// For physical devices: Try multiple approaches
// 1. Use EXPO_PUBLIC_BACKEND_IP if set (most reliable)
// 2. Use EXPO_PUBLIC_BACKEND_HOSTNAME with .local (mDNS)
// 3. Use Expo's network IP detection
const getLocalBackendPhysicalDevice = (): string => {
  // Option 1: Direct IP override (most reliable)
  const backendIp = process.env.EXPO_PUBLIC_BACKEND_IP;
  if (backendIp) {
    return `http://${backendIp}:3001/api/v1`;
  }

  // Option 2: mDNS hostname (works on some networks)
  const hostname = process.env.EXPO_PUBLIC_BACKEND_HOSTNAME;
  if (hostname) {
    return `http://${hostname}.local:3001/api/v1`;
  }

  // Option 3: Try to use Expo's detected host IP
  // This is set by Metro bundler based on your machine's IP
  const expoDevServerUrl = Constants.expoConfig?.hostUri;
  if (expoDevServerUrl) {
    // Extract IP from expo://192.168.x.x:8081
    const match = expoDevServerUrl.match(/(\d+\.\d+\.\d+\.\d+)/);
    if (match && match[1]) {
      return `http://${match[1]}:3001/api/v1`;
    }
  }

  // Fallback to localhost (won't work but better than crashing)
  console.warn('⚠️  Could not detect backend IP. Set EXPO_PUBLIC_BACKEND_IP in .env.local');
  return 'http://localhost:3001/api/v1';
};
export const LOCAL_BACKEND_PHYSICAL_DEVICE = getLocalBackendPhysicalDevice();

/**
 * Get API base URL
 * Priority:
 * 1. EXPO_PUBLIC_API_URL environment variable (manual override)
 * 2. App config from app.config.js (EAS builds)
 * 3. Smart platform defaults (simulator vs physical device)
 */
const getApiBaseUrl = (): string => {
  // 1. Check environment variable override (highest priority)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // 2. Check app config (set by EAS builds)
  const configUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configUrl) {
    return configUrl;
  }

  // 3. Production mode - use deployed backend
  if (!__DEV__) {
    return DEPLOYED_BACKEND_PROD;
  }

  // 4. Development mode - smart platform detection
  if (Platform.OS === 'ios') {
    const isSimulator = Constants.isDevice === false;
    if (isSimulator) {
      return LOCAL_BACKEND_IOS_SIMULATOR;
    } else {
      // Physical iOS device - auto-detect IP from Expo
      return LOCAL_BACKEND_PHYSICAL_DEVICE;
    }
  }

  if (Platform.OS === 'android') {
    // Android can be emulator or physical device
    const isEmulator = Constants.isDevice === false;

    if (isEmulator) {
      return LOCAL_BACKEND_ANDROID_EMULATOR;
    } else {
      // Physical Android device - auto-detect IP from Expo
      return LOCAL_BACKEND_PHYSICAL_DEVICE;
    }
  }

  // Fallback
  return LOCAL_BACKEND_IOS_SIMULATOR;
};

/**
 * Current API base URL
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Check if using local backend
 */
export const isLocalBackend = (): boolean => {
  return (
    API_BASE_URL.includes('localhost') ||
    API_BASE_URL.includes('10.0.2.2') ||
    API_BASE_URL.includes('192.168')
  );
};

/**
 * Get backend display name
 */
export const getBackendDisplayName = (): string => {
  if (isLocalBackend()) {
    return 'Local';
  }
  return 'Deployed';
};

/**
 * Configuration object
 */
export const ApiConfig = {
  API_BASE_URL,
  DEPLOYED_BACKEND_DEV,
  DEPLOYED_BACKEND_STAGING,
  DEPLOYED_BACKEND_PROD,
  LOCAL_BACKEND_IOS_SIMULATOR,
  LOCAL_BACKEND_ANDROID_EMULATOR,
  LOCAL_BACKEND_PHYSICAL_DEVICE,
  isLocalBackend,
  getBackendDisplayName,
};

export default ApiConfig;

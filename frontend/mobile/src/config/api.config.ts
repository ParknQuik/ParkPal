import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * API Configuration
 *
 * Simple environment-based configuration.
 * Set EXPO_PUBLIC_API_URL in .env.local to override defaults.
 *
 * Defaults:
 * - Production: Deployed backend
 * - Development iOS: http://localhost:3001/api/v1
 * - Development Android: http://10.0.2.2:3001/api/v1
 */

// Deployed backend URL
export const DEPLOYED_BACKEND = 'https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api/v1';

// Local backend URLs (platform-specific)
export const LOCAL_BACKEND_IOS = 'http://localhost:3001/api/v1';
export const LOCAL_BACKEND_ANDROID = 'http://10.0.2.2:3001/api/v1';

/**
 * Get API base URL
 * Priority:
 * 1. EXPO_PUBLIC_API_URL environment variable
 * 2. App config (from app.config.js)
 * 3. Platform-specific defaults
 */
const getApiBaseUrl = (): string => {
  // 1. Check environment variable (highest priority)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // 2. Check app config
  const configUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configUrl) {
    return configUrl;
  }

  // 3. Defaults based on environment
  if (!__DEV__) {
    return DEPLOYED_BACKEND;
  }

  // 4. Development defaults (platform-specific)
  return Platform.select({
    ios: LOCAL_BACKEND_IOS,
    android: LOCAL_BACKEND_ANDROID,
    default: LOCAL_BACKEND_IOS,
  }) as string;
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
  DEPLOYED_BACKEND,
  LOCAL_BACKEND_IOS,
  LOCAL_BACKEND_ANDROID,
  isLocalBackend,
  getBackendDisplayName,
};

export default ApiConfig;

import AsyncStorage from '@react-native-async-storage/async-storage';
import { configAPI } from './api';

const MAPS_API_KEY_STORAGE = 'google_maps_api_key';
const API_KEY_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface MapsConfig {
  apiKey: string;
  timestamp: number;
}

class MapsConfigService {
  private apiKey: string | null = null;

  /**
   * Get Google Maps API key
   * Fetches from backend if not cached or expired
   */
  async getApiKey(): Promise<string> {
    try {
      // Check if we have a cached key
      if (this.apiKey) {
        return this.apiKey;
      }

      // Try to get from AsyncStorage
      const stored = await AsyncStorage.getItem(MAPS_API_KEY_STORAGE);
      if (stored) {
        const config: MapsConfig = JSON.parse(stored);
        const now = Date.now();

        // Check if cached key is still valid (less than 24 hours old)
        if (now - config.timestamp < API_KEY_EXPIRY) {
          this.apiKey = config.apiKey;
          return this.apiKey;
        }
      }

      // Fetch from backend with retry
      const newApiKey = await this.fetchWithRetry();

      // Cache the key
      await this.cacheApiKey(newApiKey);

      this.apiKey = newApiKey;
      return this.apiKey;
    } catch (error) {
      ;

      // Try to return cached key even if expired
      const stored = await AsyncStorage.getItem(MAPS_API_KEY_STORAGE);
      if (stored) {
        const config: MapsConfig = JSON.parse(stored);
        ;
        return config.apiKey;
      }

      throw new Error('Failed to get Google Maps API key');
    }
  }

  /**
   * Fetch API key with retry logic
   */
  private async fetchWithRetry(retries = 3, delay = 2000): Promise<string> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await configAPI.getGoogleMapsApiKey();
        return response.data.apiKey;
      } catch (error) {
        if (i === retries - 1) {
          // Last retry failed, throw error
          throw error;
        }
        // Wait before retrying
        ;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Failed to fetch API key after retries');
  }

  /**
   * Cache the API key in AsyncStorage
   */
  private async cacheApiKey(apiKey: string): Promise<void> {
    try {
      const config: MapsConfig = {
        apiKey,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(MAPS_API_KEY_STORAGE, JSON.stringify(config));
    } catch (error) {
      ;
    }
  }

  /**
   * Clear cached API key (useful for logout or manual refresh)
   */
  async clearCache(): Promise<void> {
    try {
      this.apiKey = null;
      await AsyncStorage.removeItem(MAPS_API_KEY_STORAGE);
    } catch (error) {
      ;
    }
  }

  /**
   * Refresh API key from backend
   */
  async refreshApiKey(): Promise<string> {
    await this.clearCache();
    return this.getApiKey();
  }
}

// Export singleton instance
export const mapsConfig = new MapsConfigService();
export default mapsConfig;

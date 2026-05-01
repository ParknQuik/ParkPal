import { analyticsAPI } from './analyticsApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const ANALYTICS_OPT_IN_KEY = 'analytics_opt_in';
const ACTIVE_SESSION_KEY = 'active_analytics_session';

interface AnalyticsSession {
  sessionId: number;
  zoneId: number;
  startTime: string;
  status: 'searching' | 'parked' | 'abandoned';
}

class AnalyticsService {
  private activityInterval: ReturnType<typeof setInterval> | null = null;
  private locationSubscription: Location.LocationSubscription | null = null;
  
  async isOptedIn(): Promise<boolean> {
    const value = await AsyncStorage.getItem(ANALYTICS_OPT_IN_KEY);
    return value !== 'false';
  }

  async setOptIn(optIn: boolean): Promise<void> {
    await AsyncStorage.setItem(ANALYTICS_OPT_IN_KEY, optIn.toString());
    if (!optIn) {
      await this.stopTracking();
    }
  }

  async enterZone(zoneId: number, latitude: number, longitude: number): Promise<AnalyticsSession | null> {
    const optedIn = await this.isOptedIn();
    if (!optedIn) return null;

    try {
      const response = await analyticsAPI.zoneEnter(zoneId, latitude, longitude);
      const { sessionId, circlingStartTime } = response.data;

      const session: AnalyticsSession = {
        sessionId,
        zoneId,
        startTime: circlingStartTime,
        status: 'searching',
      };

      await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));

      this.startActivityTracking(latitude, longitude);

      return session;
    } catch (error: any) {
      console.log('[Analytics] Zone enter failed:', error?.response?.data?.error || error?.message);
      return null;
    }
  }

  async logActivity(activityType: string, confidence: number, latitude?: number, longitude?: number): Promise<void> {
    const session = await this.getActiveSession();
    if (!session) return;

    try {
      await analyticsAPI.logActivity(session.sessionId, activityType, confidence, latitude, longitude);
    } catch (error: any) {
      console.log('[Analytics] Activity log failed:', error?.message);
    }
  }

  async exitZone(sessionId: number, parked?: boolean): Promise<void> {
    try {
      await analyticsAPI.zoneExit(sessionId, undefined, parked);
      await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
      this.stopActivityTracking();
    } catch (error) {
      console.log('[Analytics] Zone exit failed:', error?.message);
    }
  }

  async getZoneAvailability(zoneId: number) {
    try {
      const response = await analyticsAPI.getZoneAvailability(zoneId);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getZones(city?: string, type?: string) {
    try {
      const response = await analyticsAPI.getZones(city, type);
      return response.data?.zones || [];
    } catch (error) {
      return [];
    }
  }

  async getActiveSession(): Promise<AnalyticsSession | null> {
    const value = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private startActivityTracking(lat: number, lon: number): void {
    this.stopActivityTracking();
    
    this.activityInterval = setInterval(async () => {
      const session = await this.getActiveSession();
      if (!session) {
        this.stopActivityTracking();
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        await this.logActivity('IN_VEHICLE', 80, location.coords.latitude, location.coords.longitude);
      } catch (error) {
        console.log('[Analytics] Location tracking error:', error?.message);
      }
    }, 10000);
  }

  private stopActivityTracking(): void {
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }
  }

  async stopTracking(): Promise<void> {
    this.stopActivityTracking();
    const session = await this.getActiveSession();
    if (session) {
      await this.exitZone(session.sessionId, false);
    }
  }
}

export const analyticsService = new AnalyticsService();

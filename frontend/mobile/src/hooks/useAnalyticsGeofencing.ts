import { useEffect, useRef, useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { analyticsService } from '../services/analytics';

interface Zone {
  id: number;
  name: string;
  centerLat: number;
  centerLon: number;
  radius: number;
}

interface ZoneCrossingEvent {
  type: 'enter' | 'exit';
  zone: Zone;
  timestamp: Date;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useAnalyticsGeofencing(zones: Zone[], enabled: boolean = true) {
  const [currentZone, setCurrentZone] = useState<Zone | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const lastZoneIdRef = useRef<number | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const checkZoneEntry = useCallback(async (latitude: number, longitude: number) => {
    if (!enabled) return;

    for (const zone of zones) {
      const distance = calculateDistance(latitude, longitude, zone.centerLat, zone.centerLon);

      if (distance <= zone.radius && lastZoneIdRef.current !== zone.id) {
        ;

        const session = await analyticsService.enterZone(zone.id, latitude, longitude);

        if (session) {
          setCurrentZone(zone);
          setSessionId(session.sessionId);
          lastZoneIdRef.current = zone.id;
        }
        return;
      }
    }

    if (lastZoneIdRef.current !== null) {
      let isInAnyZone = false;
      for (const zone of zones) {
        if (zone.id === lastZoneIdRef.current) {
          const distance = calculateDistance(latitude, longitude, zone.centerLat, zone.centerLon);
          if (distance <= zone.radius) {
            isInAnyZone = true;
            break;
          }
        }
      }

      if (!isInAnyZone) {
        ;
        const session = await analyticsService.getActiveSession();
        if (session) {
          await analyticsService.exitZone(session.sessionId, false);
        }
        setCurrentZone(null);
        setSessionId(null);
        lastZoneIdRef.current = null;
      }
    }
  }, [zones, enabled]);

  useEffect(() => {
    if (!enabled) {
      locationSubscriptionRef.current?.remove();
      locationSubscriptionRef.current = null;
      return;
    }

    let subscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        ;
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 50,
        },
        (location) => {
          checkZoneEntry(location.coords.latitude, location.coords.longitude);
        }
      );

      locationSubscriptionRef.current = subscription;
    };

    startTracking();

    return () => {
      subscription?.remove();
      locationSubscriptionRef.current = null;
    };
  }, [enabled, checkZoneEntry]);

  useEffect(() => {
    const restoreSession = async () => {
      const session = await analyticsService.getActiveSession();
      if (session) {
        const zone = zones.find(z => z.id === session.zoneId);
        if (zone) {
          setCurrentZone(zone);
          setSessionId(session.sessionId);
          lastZoneIdRef.current = session.zoneId;
        }
      }
    };
    restoreSession();
  }, [zones]);

  return {
    currentZone,
    sessionId,
    isTracking: enabled,
  };
}

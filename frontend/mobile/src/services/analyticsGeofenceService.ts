/**
 * Analytics Geofence Service (Phase 6A)
 *
 * Monitors user location and detects zone entry/exit using @turf/turf polygon math.
 * Uses expo-location foreground watching (background task support via expo-task-manager
 * can be layered on in Phase 6B once we have the background entitlement).
 *
 * Usage:
 *   GeofenceService.start(zones, userId, dispatch)
 *   GeofenceService.stop()
 */

import * as Location from 'expo-location';
import * as turf from '@turf/turf';
import { AppDispatch } from '../store';
import { enterZone, exitZone, logActivity } from '../store/slices/analyticsSlice';
import { Zone, ActivityType } from '../types';

type LocationSubscription = { remove: () => void };

let locationSubscription: LocationSubscription | null = null;
let currentZoneId: number | null = null;
let currentSessionId: number | null = null;
let currentUserId: number | null = null;
let activeZones: Zone[] = [];
let storeDispatch: AppDispatch | null = null;

// Simple activity inference from speed (m/s)
function inferActivity(speedMps: number | null): ActivityType {
  if (speedMps === null || speedMps < 0) return 'STILL';
  if (speedMps < 0.5) return 'STILL';
  if (speedMps < 2.0) return 'ON_FOOT';
  return 'IN_VEHICLE';
}

function buildTurfPolygon(zone: Zone) {
  const coords = zone.geofencePolygon.map((p) => [p.longitude, p.latitude]);
  // turf requires first and last point to match
  if (
    coords[0][0] !== coords[coords.length - 1][0] ||
    coords[0][1] !== coords[coords.length - 1][1]
  ) {
    coords.push(coords[0]);
  }
  return turf.polygon([coords]);
}

function isInsideZone(lat: number, lon: number, zone: Zone): boolean {
  try {
    const point = turf.point([lon, lat]);
    const polygon = buildTurfPolygon(zone);
    return turf.booleanPointInPolygon(point, polygon);
  } catch {
    return false;
  }
}

async function handleLocationUpdate(
  location: Location.LocationObject,
  userId: number,
  dispatch: AppDispatch,
  zones: Zone[]
) {
  const { latitude, longitude, speed } = location.coords;

  // Find which zone (if any) the user is currently inside
  const matchedZone = zones.find((z) => isInsideZone(latitude, longitude, z)) ?? null;

  if (matchedZone && matchedZone.id !== currentZoneId) {
    // Entered a new zone
    currentZoneId = matchedZone.id;

    try {
      const result = await dispatch(
        enterZone({ userId, zoneId: matchedZone.id, latitude, longitude })
      ).unwrap();
      currentSessionId = result.sessionId;
    } catch {
      // Non-fatal — geofence event failed, keep watching
    }
  } else if (!matchedZone && currentZoneId !== null) {
    // Exited the zone
    if (currentSessionId !== null) {
      try {
        await dispatch(exitZone({ sessionId: currentSessionId })).unwrap();
      } catch {
        // Non-fatal
      }
    }
    currentZoneId = null;
    currentSessionId = null;
  }

  // Log activity if inside a zone
  if (currentSessionId !== null && currentZoneId !== null) {
    const activityType = inferActivity(speed);
    try {
      await dispatch(
        logActivity({
          userId,
          sessionId: currentSessionId,
          activityType,
          confidence: 70, // heuristic confidence for speed-based inference
          latitude,
          longitude,
        })
      ).unwrap();
    } catch {
      // Non-fatal
    }
  }
}

const GeofenceService = {
  async start(zones: Zone[], userId: number, dispatch: AppDispatch) {
    if (locationSubscription) {
      // Already running
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[GeofenceService] Location permission denied — analytics disabled');
      return;
    }

    activeZones = zones;
    currentUserId = userId;
    storeDispatch = dispatch;

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15000,  // poll every 15s
        distanceInterval: 30, // or every 30m moved
      },
      (location) => {
        handleLocationUpdate(location, userId, dispatch, zones);
      }
    );
  },

  stop() {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
    if (currentSessionId !== null && storeDispatch !== null) {
      storeDispatch(exitZone({ sessionId: currentSessionId }));
    }
    currentZoneId = null;
    currentSessionId = null;
    currentUserId = null;
    activeZones = [];
    storeDispatch = null;
  },

  isRunning() {
    return locationSubscription !== null;
  },
};

export default GeofenceService;

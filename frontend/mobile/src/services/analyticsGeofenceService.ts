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

import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import * as turf from '@turf/turf';
import { AppDispatch } from '../store';
import { enterZone, exitZone, logActivity } from '../store/slices/analyticsSlice';
import { Zone, ActivityType } from '../types';
import {
  requestPermission as requestActivityPermission,
  startActivityUpdates,
  stopActivityUpdates,
} from '../../modules/parking-activity-recognition/src';

type LocationSubscription = { remove: () => void };

let locationSubscription: LocationSubscription | null = null;
let currentZoneId: number | null = null;
let currentSessionId: number | null = null;
let currentUserId: number | null = null;
let activeZones: Zone[] = [];
let storeDispatch: AppDispatch | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let appIsForeground = AppState.currentState === 'active';
let serviceGeneration = 0;
let activityPermissionGranted: boolean | null = null;
let latestCoordinates: { latitude: number; longitude: number } | null = null;
let activityUpdatesStarted = false;

async function startActivityRecognition(generation: number) {
  const permissionGranted = activityPermissionGranted ?? await requestActivityPermission();
  activityPermissionGranted = permissionGranted;
  if (!permissionGranted || generation !== serviceGeneration || !appIsForeground) return;

  try {
    await startActivityUpdates((activity) => {
      if (
        generation !== serviceGeneration ||
        !appIsForeground ||
        currentSessionId === null ||
        latestCoordinates === null ||
        storeDispatch === null ||
        !activity.activityType
      ) return;

      void storeDispatch(logActivity({
        userId: currentUserId as number,
        sessionId: currentSessionId,
        activityType: activity.activityType,
        confidence: activity.confidence,
        ...latestCoordinates,
      }));
    });
    if (generation !== serviceGeneration || !appIsForeground || currentSessionId === null) {
      await stopActivityUpdates();
      return;
    }
    activityUpdatesStarted = true;
  } catch {
    const sessionId = currentSessionId;
    currentSessionId = null;
    latestCoordinates = null;
    if (sessionId !== null && storeDispatch !== null) {
      void storeDispatch(exitZone({ sessionId, parked: false }));
    }
  }
}

function closeCurrentSession() {
  if (activityUpdatesStarted) {
    activityUpdatesStarted = false;
    void stopActivityUpdates();
  }
  if (currentSessionId !== null && storeDispatch !== null) {
    storeDispatch(exitZone({ sessionId: currentSessionId }));
  }
  currentZoneId = null;
  currentSessionId = null;
  latestCoordinates = null;
}

async function watchForegroundLocation() {
  if (locationSubscription || !appIsForeground || !activeZones.length || !currentUserId || !storeDispatch) {
    return;
  }
  const generation = serviceGeneration;
  const { status } = await Location.getForegroundPermissionsAsync();
  if (generation !== serviceGeneration) return;
  if (status !== 'granted' || !appIsForeground) {
    closeCurrentSession();
    return;
  }

  const subscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 30 },
    (location) => {
      if (currentUserId !== null && storeDispatch !== null && generation === serviceGeneration) {
        void handleLocationUpdate(location, currentUserId, storeDispatch, activeZones, generation);
      }
    }
  );
  if (generation !== serviceGeneration || !appIsForeground) {
    subscription.remove();
    return;
  }
  locationSubscription = subscription;
}

function handleAppStateChange(nextState: AppStateStatus) {
  const wasForeground = appIsForeground;
  appIsForeground = nextState === 'active';
  if (wasForeground && !appIsForeground) {
    serviceGeneration += 1;
    locationSubscription?.remove();
    locationSubscription = null;
    closeCurrentSession();
  } else if (!wasForeground && appIsForeground) {
    void watchForegroundLocation();
  }
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
  zones: Zone[],
  generation: number
) {
  if (generation !== serviceGeneration || !appIsForeground) return;
  const { latitude, longitude } = location.coords;

  // Find which zone (if any) the user is currently inside
  const matchedZone = zones.find((z) => isInsideZone(latitude, longitude, z)) ?? null;

  if (matchedZone && matchedZone.id !== currentZoneId) {
    // Entered a new zone
    currentZoneId = matchedZone.id;

    try {
      const permissionGranted = activityPermissionGranted ?? await requestActivityPermission();
      activityPermissionGranted = permissionGranted;
      if (!permissionGranted || generation !== serviceGeneration || !appIsForeground) return;

      const result = await dispatch(
        enterZone({ userId, zoneId: matchedZone.id, latitude, longitude })
      ).unwrap();
      if (generation !== serviceGeneration || !appIsForeground) {
        void dispatch(exitZone({ sessionId: result.sessionId }));
        return;
      }
      currentSessionId = result.sessionId;
      latestCoordinates = { latitude, longitude };
      void startActivityRecognition(generation);
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
    latestCoordinates = null;
    if (activityUpdatesStarted) {
      activityUpdatesStarted = false;
      void stopActivityUpdates();
    }
  }

  // Keep the newest foreground coordinate for the native activity callback.
  if (currentSessionId !== null && currentZoneId !== null) {
    if (generation !== serviceGeneration || !appIsForeground) return;
    latestCoordinates = { latitude, longitude };
  }
}

const GeofenceService = {
  async start(zones: Zone[], userId: number, dispatch: AppDispatch) {
    serviceGeneration += 1;
    const generation = serviceGeneration;
    activeZones = zones.filter((zone) => zone.geofencePolygon.length >= 3);
    activityPermissionGranted = null;
    currentUserId = userId;
    storeDispatch = dispatch;
    appIsForeground = AppState.currentState === 'active';
    appStateSubscription?.remove();
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (generation !== serviceGeneration) return;
    if (status !== 'granted') {
      this.stop();
      return;
    }
    await watchForegroundLocation();
  },

  stop() {
    serviceGeneration += 1;
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
    appStateSubscription?.remove();
    appStateSubscription = null;
    closeCurrentSession();
    currentUserId = null;
    activeZones = [];
    activityPermissionGranted = null;
    storeDispatch = null;
  },

  isRunning() {
    return locationSubscription !== null;
  },
};

export default GeofenceService;

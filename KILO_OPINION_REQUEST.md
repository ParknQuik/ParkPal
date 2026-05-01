# ParkPal — Kilo Code Review Request

**Prepared by:** Claude Code  
**Date:** May 1, 2026  
**Branch:** `feat/mobile-analytics-integration`  
**Purpose:** Review and verify Phase 6A analytics work before merging to dev

---

## Context

Claude Code completed Phase 6A of the mobile analytics integration on this branch. This document tells you exactly what was built, what to verify, and what still needs to be done in Phase 6B.

**Previous baseline:** `CLAUDE_OPINION_REQUEST.md` — all crash-level bugs and broken core features from that doc are already fixed. Do not re-audit those. Start from here.

---

## What Was Built (Phase 6A)

### 1. New packages installed
- `expo-task-manager` (SDK 54 compatible)
- `@turf/turf` (geofencing polygon math)

**Verify:** Check `frontend/mobile/package.json` — both packages should be in `dependencies`.

---

### 2. `frontend/mobile/src/services/api.ts` — `analyticsAPI` added

Six new endpoints at the bottom of the file:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/analytics/zone/enter` | Notify backend when user enters a geofence zone |
| POST | `/analytics/zone/exit` | Notify backend when user exits a geofence zone |
| POST | `/analytics/activity` | Log activity event (IN_VEHICLE, STILL, ON_FOOT, etc.) |
| GET | `/analytics/zones/:zoneId/availability` | Get real-time slot availability + circling time estimate |
| GET | `/analytics/zones/:zoneId/metrics` | Get historical zone metrics |
| GET | `/analytics/zones` | List all zones (used by geofence service on startup) |

**Verify:**
- All 6 methods exist and are exported as `analyticsAPI`
- Request shapes match `backend/routes/analytics.js` exactly
- No hardcoded URLs — uses the same shared `api` axios instance

---

### 3. `frontend/mobile/src/types/index.ts` — New analytics types

Added at the bottom, before `RootState`:

```typescript
ActivityType
Zone
ZoneAvailability
ParkingSession
ActivityEvent
AnalyticsState
```

Also added `zoneId?: number` to `MarketplaceListing`.

`RootState` now includes `analytics: AnalyticsState`.

**Verify:**
- `RootState` has `analytics` field
- `MarketplaceListing` has optional `zoneId`
- No TypeScript errors in these types (`npx tsc --noEmit`)

---

### 4. `frontend/mobile/src/store/slices/analyticsSlice.ts` — New Redux slice

**Async thunks:**
- `loadAnalyticsOptIn` — reads opt-in boolean from AsyncStorage on app start
- `setAnalyticsOptIn` — persists opt-in decision to AsyncStorage + Redux
- `enterZone` — calls `analyticsAPI.zoneEnter`, stores active session in Redux
- `exitZone` — calls `analyticsAPI.zoneExit`, clears active session
- `logActivity` — calls `analyticsAPI.logActivity`
- `fetchZoneAvailability` — calls `analyticsAPI.getZoneAvailability`, caches result in `zoneAvailability` dict

**State shape:**
```typescript
{
  activeSession: ParkingSession | null,
  activeZoneId: number | null,
  zoneAvailability: Record<number, ZoneAvailability>,
  optedIn: boolean,
  loading: boolean,
  error: string | null,
}
```

**Verify:**
- All 6 thunks are exported
- `clearError` and `clearActiveSession` action creators are exported
- `enterZone.fulfilled` correctly maps `action.meta.arg.userId` to store session
- No TypeScript errors

---

### 5. `frontend/mobile/src/store/index.ts` — Redux store updated

Added `analyticsReducer` from `analyticsSlice`.

**Verify:** `analytics: analyticsReducer` is in the reducer map.

---

### 6. `frontend/mobile/src/services/analyticsGeofenceService.ts` — New geofence service

**What it does:**
- Requests foreground location permission
- Watches GPS position every 15 seconds or every 30 metres moved
- For each position update, checks if user is inside any zone polygon using `@turf/turf booleanPointInPolygon`
- On zone entry: dispatches `enterZone` thunk, stores session ID
- On zone exit: dispatches `exitZone` thunk, clears session
- While inside a zone: dispatches `logActivity` with speed-inferred activity type
  - speed < 0.5 m/s → STILL
  - speed 0.5–2.0 m/s → ON_FOOT
  - speed > 2.0 m/s → IN_VEHICLE
- `GeofenceService.start(zones, userId, dispatch)` — starts watching
- `GeofenceService.stop()` — removes subscription, fires final exit if in zone
- `GeofenceService.isRunning()` — boolean check

**Verify:**
- `start()` does not crash if called when already running (guarded)
- `stop()` removes the location subscription cleanly
- Activity log failures do not throw (wrapped in try/catch)
- Zone entry failures do not throw (non-fatal)
- Imports from `@turf/turf` resolve correctly (check for any module resolution errors)

---

### 7. `frontend/mobile/src/components/AnalyticsOptInModal.tsx` — New component

Bottom sheet modal shown **once** after first login. Explains anonymous data collection with three bullet points. Two buttons: "Sure, I'll help" (accept) and "No thanks" (decline).

**Verify:**
- Modal only appears once — controlled by `analytics_opt_in_prompted` AsyncStorage key
- Accepting calls `setAnalyticsOptIn(true)` + sets the prompted key
- Declining calls `setAnalyticsOptIn(false)` + sets the prompted key
- Modal does NOT re-appear on subsequent app opens regardless of choice
- No layout issues on iPhone SE (small screen)

---

### 8. `frontend/mobile/src/navigation/AppNavigator.tsx` — Updated

Added three behaviors:

1. **On mount:** dispatches `loadAnalyticsOptIn` to restore opt-in state from AsyncStorage
2. **After login:** checks if `analytics_opt_in_prompted` key exists; if not, shows `AnalyticsOptInModal`
3. **When `isAuthenticated && optedIn`:** calls `analyticsAPI.getZones()`, maps response to `Zone[]`, calls `GeofenceService.start()`. When either condition becomes false, calls `GeofenceService.stop()`.

**Verify:**
- `GeofenceService.start()` is not called if zones array is empty (guarded)
- `GeofenceService.stop()` is called on unmount via `useEffect` cleanup
- Zone fetch failure is caught and does not crash the navigator
- `user.id` is passed as `Number(user.id)` (coerced to number)
- `AnalyticsOptInModal` renders outside `NavigationContainer` children (it does — at the same level as `MainStack`/`AuthStack`)

---

### 9. `frontend/mobile/src/screens/ExploreMap.tsx` — Updated

Two additions:

**Zone availability fetch:**
- When `selectedListing?.zoneId` exists, dispatches `fetchZoneAvailability(zoneId)`
- Reads `zoneAvailability[selectedListing.zoneId]` from Redux

**Zone availability UI in bottom sheet card** (shown only when `selectedZoneAvail` is non-null):
- Availability badge: `X/Y open`, color-coded:
  - Green (`#dcfce7`) if occupancy < 50%
  - Yellow (`#fef9c3`) if occupancy 50–79%
  - Red (`#fee2e2`) if occupancy ≥ 80%
- Circling time: `~N min to park` (rounds up from seconds)

**Verify:**
- Badge and circling time only appear when `zoneId` is present on the listing
- No crash when `zoneAvailability` entry is missing for a zone
- Colors are visible and not clashing with the card design
- `useEffect` for zone availability fetch has `selectedListing?.zoneId` as dependency (not causing infinite loop)

---

## TypeScript Status

Run: `cd frontend/mobile && npx tsc --noEmit`

**Expected:** Zero errors in any of the new analytics files. Some pre-existing errors exist in other screens (HomeDashboard, MyBookingsScreen, PaymentScreen, etc.) — those are not our concern here and should not be introduced by this work.

**Files that must be error-free:**
- `src/services/api.ts`
- `src/services/analyticsGeofenceService.ts`
- `src/store/slices/analyticsSlice.ts`
- `src/store/index.ts`
- `src/types/index.ts`
- `src/components/AnalyticsOptInModal.tsx`
- `src/navigation/AppNavigator.tsx`
- `src/screens/ExploreMap.tsx` (zoneId errors should be gone)

---

## What Was NOT Built (Phase 6B — Your Next Tasks)

These are intentionally deferred. Do them in order:

### 1. Settings toggle for analytics opt-in
**Where:** Add to `ProfileScreen.tsx` or `SecurityPrivacyScreen.tsx`  
**What:** A toggle switch that reads `analytics.optedIn` from Redux and dispatches `setAnalyticsOptIn(true/false)` when toggled. Label: "Share anonymous parking data".  
**Why deferred:** Needs `SecurityPrivacyScreen.tsx` to be properly wired first (it currently exists but may be a stub).

### 2. Zone availability circle overlays on ExploreMap
**Where:** `ExploreMap.tsx`, inside `<MapView>`  
**What:** For each zone fetched from `analyticsAPI.getZones()`, render a `<Circle>` component centered on `(centroidLat, centroidLon)` with `radius={zone.radiusMeters}`. Color the fill based on occupancy (green/yellow/red matching the badge colors). Fetch zones once on mount, store in local state.  
**Why deferred:** Requires zones to be fetched in ExploreMap context (currently only fetched in AppNavigator for the geofence service).

### 3. Background location tracking
**Where:** New service, probably `src/services/analyticsBackgroundService.ts`  
**What:** Use `expo-task-manager` (already installed) + `Location.startLocationUpdatesAsync()` to track location when app is in the background. Requires `UIBackgroundModes: location` in `app.json` (iOS) and `ACCESS_BACKGROUND_LOCATION` permission (Android).  
**Why deferred:** Requires Apple/Google background location entitlement — cannot be tested in Expo Go, needs an EAS build. Also increases battery usage and privacy scrutiny.  
**Do not start this until:** App Store account is set up and background location entitlement is approved.

---

## Backend Reference

All analytics endpoints are in `backend/routes/analytics.js`. The backend is fully implemented — no backend changes are needed for Phase 6A or 6B. The 5 Phase 6A endpoints are:

| Endpoint | Request body / params |
|----------|-----------------------|
| `POST /analytics/zone/enter` | `{ userId, zoneId, latitude, longitude }` |
| `POST /analytics/zone/exit` | `{ sessionId, exitTime?, parked? }` |
| `POST /analytics/activity` | `{ userId, sessionId, activityType, confidence, latitude?, longitude? }` |
| `GET /analytics/zones/:zoneId/availability` | — |
| `GET /analytics/zones` | — |

Valid `activityType` values: `IN_VEHICLE`, `STILL`, `ON_FOOT`, `WALKING`, `RUNNING`, `ON_BICYCLE`

---

## Files Changed in This Branch

```
frontend/mobile/package.json              — expo-task-manager, @turf/turf added
frontend/mobile/package-lock.json         — updated
frontend/mobile/src/services/api.ts       — analyticsAPI added
frontend/mobile/src/services/analyticsGeofenceService.ts  — NEW
frontend/mobile/src/store/index.ts        — analyticsReducer added
frontend/mobile/src/store/slices/analyticsSlice.ts  — NEW
frontend/mobile/src/types/index.ts        — analytics types + zoneId on listing
frontend/mobile/src/components/AnalyticsOptInModal.tsx  — NEW
frontend/mobile/src/navigation/AppNavigator.tsx  — geofence wiring + opt-in modal
frontend/mobile/src/screens/ExploreMap.tsx  — zone availability badge + circling time
STATUS_REPORT.md                           — readiness 65→70, Phase 6A logged
ROADMAP.md                                 — Phase 6A complete, 6B next steps
```

---

## Recommended Verification Steps

1. `cd frontend/mobile && npx tsc --noEmit` — confirm zero new TS errors
2. `npm test` — confirm 45/45 still passing (no regressions)
3. Boot app in Expo Go — confirm opt-in modal appears on first login
4. Accept opt-in — confirm `analytics_opted_in = "true"` in AsyncStorage
5. Kill and reopen app — confirm modal does NOT appear again
6. Select a listing on ExploreMap that has a `zoneId` — confirm badge appears
7. Select a listing without a `zoneId` — confirm no badge, no crash

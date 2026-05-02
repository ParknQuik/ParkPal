# ParkPal — Kilo Code Review Request

**Prepared by:** Claude Code  
**Date:** May 2, 2026  
**Branch:** `feature/analytics-backend`  
**Purpose:** Full multi-agent codebase audit — findings for Kilo Code to action

---

## Audit History

| Date | Rating | Key Finding |
|------|--------|-------------|
| May 1, 2026 | Phase 6A complete | Analytics backend + mobile layer built, opt-in modal wired |
| May 2, 2026 | See below | 5-agent audit: 6 critical security issues, 15 high, 18 medium found |

---

## CRITICAL — Fix Before Any Production Traffic

These are security vulnerabilities. Do not ship until resolved.

### C1. Analytics routes have zero authentication
**File:** `backend/routes/analytics.js:30, 92, 143, 173, 244, 301, 354`

All 7 analytics endpoints (`/zone/enter`, `/activity`, `/zone/exit`, `/zones/:id/availability`, `/zones/:id/metrics`, `/sessions/:sessionId`, `/zones`) have no `authenticate` middleware. Worse, `/zone/enter` and `/activity` accept `userId` from the request body — any anonymous caller can poison analytics data for any user, or read another user's parking session.

**Fix:**
```javascript
const { authenticate } = require('../services/auth');
router.post('/analytics/zone/enter', authenticate, validateBody(zoneEnterSchema), async (req, res) => {
  const { zoneId, latitude, longitude } = req.body;
  const userId = req.user.id; // derive from token, never trust body
```

---

### C2 + C3. PayMongo webhook signature verification is broken in two ways
**Files:** `services/paymongo.js:412-415`, `paymentsController.js:427`, `index.js:105`

**Problem 1 (C2):** Signature verification is skipped when `NODE_ENV !== 'production'`. A forged `payment.paid` webhook POSTed to `/api/v1/payments/webhook` (unauthenticated route) marks any booking as paid in dev/staging.

**Problem 2 (C3):** The HMAC is computed over `JSON.stringify(payload)` (re-serialized parsed JSON) rather than the raw request bytes. PayMongo signs the original byte stream — key ordering or whitespace differences mean the computed HMAC will never match.

**Fix:**
1. Mount the webhook route *before* `express.json()` with `express.raw({ type: 'application/json' })`:
```javascript
// index.js — before app.use(express.json(...))
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), paymentsWebhookHandler);
```
2. Always require valid signature — fail closed if `webhookSecret` is missing:
```javascript
// paymongo.js
if (!webhookSecret) throw new Error('PAYMONGO_WEBHOOK_SECRET missing');
```
3. Remove the `NODE_ENV === 'production'` gate in `paymentsController.js:427`.

---

### C4. Unauthenticated booking expiry endpoint exposed in production
**File:** `backend/routes/marketplace.js:725-740`

`POST /marketplace/bookings/check-expired` has no `authenticate` middleware and no environment guard. Any anonymous caller can trigger booking expiry processing, causing state changes, slot releases, and notification sends. Comment says "for testing/development" but it's mounted in production routes.

**Fix:** Remove this endpoint entirely. The cron job in `index.js:198` already handles this.

---

### C5. Cash payment intent ID is forgeable
**File:** `backend/controllers/paymentsController.js:31-38, 121-167`

`createPaymentIntent` returns `paymentIntentId: cash_${booking.id}_${Date.now()}`. Then `confirmPayment` detects the `cash_` prefix, parses `bookingId` from the string, and immediately marks the booking confirmed. A user can call `/payments/confirm` with `cash_<theirBookingId>_<anything>` to confirm without a real payment.

**Fix:** Generate a cryptographically random token server-side, persist it in the Payment record, and look up by token — never parse IDs out of a client-supplied string.

---

### C6. `extendBooking` marks payment `completed` with any client-supplied string
**File:** `backend/controllers/marketplaceController.js:2046-2186`

The booking extension inserts a Payment row with `status: 'completed'` merely because the client sent a `paymentIntentId` string. There is no PayMongo verification of the intent's state. A user can extend for free by POSTing any non-empty string.

**Fix:** Verify the payment intent status with PayMongo before marking completed. Same pattern as the main booking payment flow.

---

## HIGH — Fix Before Beta

### H1. Google OAuth doesn't verify audience/issuer/expiry
**File:** `backend/controllers/googleAuthController.js:30-35`

`tokeninfo` endpoint validates token syntax but the controller never checks `aud` (audience) matches your Google Client ID, `iss`, or `exp`. Any valid Google ID token from any project authenticates as a ParkPal user.

**Fix:** Use `google-auth-library`:
```javascript
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
```

---

### H2. Google Maps API key endpoint is public
**File:** `backend/routes/config.js:25-28`

`GET /config/maps-api-key` has no `authenticate` middleware. Any anonymous caller can `curl` and exfiltrate a billable Google Maps API key.

**Fix:** Add `authenticate` middleware to this route. Better long-term: restrict the key by bundle ID / HTTP referrer in Google Cloud Console and embed it at build time.

---

### H3. `geofencePolygon` type mismatch — polygon geofencing is silently broken
**Files:** `frontend/mobile/src/navigation/AppNavigator.tsx:61`, `frontend/mobile/src/services/analyticsGeofenceService.ts:37`

Backend stores `geofencePolygon` as a GeoJSON string. `AppNavigator.tsx:61` passes it as-is (falsy) or as an empty array. `analyticsGeofenceService.ts:37` expects `Array<{ latitude, longitude }>`. The `booleanPointInPolygon` check runs against an empty array — all zone entry/exit events from polygon detection are silently missed.

**Fix in AppNavigator.tsx:**
```javascript
geofencePolygon: z.geofencePolygon
  ? JSON.parse(z.geofencePolygon).coordinates[0].slice(0, -1).map((coord) => ({
      longitude: coord[0],
      latitude: coord[1],
    }))
  : [],
```

---

### H4. Race condition in `analyticsGeofenceService.ts` — failed zone entry is never retried
**File:** `frontend/mobile/src/services/analyticsGeofenceService.ts:69-92`

`currentZoneId` is set to `matchedZone.id` *before* the `enterZone` dispatch resolves. If the API call fails, `currentZoneId` is already set — so on the next location update, `matchedZone.id === currentZoneId` and entry is skipped forever until the user physically leaves and re-enters.

**Fix:** Only set `currentZoneId` after the dispatch succeeds:
```javascript
// Don't set currentZoneId here
try {
  const result = await dispatch(enterZone({ ... })).unwrap();
  currentZoneId = matchedZone.id; // Set only on success
  currentSessionId = result.sessionId;
} catch {
  // Will retry on next location update
}
```

Also add a `pendingZoneEntry` boolean flag to prevent concurrent dispatch calls.

---

### H5. TOCTOU race condition in booking creation and extension
**Files:** `backend/controllers/marketplaceController.js:665,782` and `2101,2129`

The availability conflict check and the booking insert (and the extension conflict check and update) are separate DB operations with no transaction. Two simultaneous requests for the same slot can both pass the conflict check and both succeed.

**Fix:** Wrap in `prisma.$transaction` with serializable isolation, or add a unique partial index on `(slotId, timeRange)`.

---

### H6. `mediaApi.uploadToGCS` ignores HTTP errors
**File:** `frontend/mobile/src/services/mediaApi.ts:53-70`

The `fetch()` result is not checked. A 4xx/5xx from GCS resolves silently, and `confirmUpload` is then called against a non-existent object.

**Fix:**
```javascript
const uploadRes = await fetch(uploadUrl, { method: 'PUT', ... });
if (!uploadRes.ok) throw new Error(`GCS upload failed: ${uploadRes.status}`);
```

---

### H7. JWT stored in unencrypted `AsyncStorage`
**Files:** `frontend/mobile/src/services/api.ts:22`, `mediaApi.ts:34`

`AsyncStorage` is unencrypted plain text on Android. The auth token should use `expo-secure-store`.

**Fix:**
```javascript
import * as SecureStore from 'expo-secure-store';
// Replace AsyncStorage.getItem('token') with SecureStore.getItemAsync('token')
```

---

### H8. `getUserPayments` returns internal PayMongo fields to clients
**File:** `backend/controllers/paymentsController.js:364-384`

The Prisma query selects all columns, returning `clientKey`, `paymentIntentId`, and other internal data.

**Fix:** Add a `select` clause limiting fields to what the client actually needs.

---

### H9. Duplicate geofencing implementations risk double-firing events
**Files:** `analyticsGeofenceService.ts` (Turf.js polygon) and `useAnalyticsGeofencing.ts` (simple radius Haversine)

Two separate zone detection systems exist. `AppNavigator` uses the service; the hook exists and could be imported elsewhere. If both run, zone entry/exit events fire twice.

**Fix:** Remove `useAnalyticsGeofencing.ts` entirely. All geofencing should go through `analyticsGeofenceService.ts`.

---

### H10. `earningsController.js` returns 100% hardcoded mock data
**File:** `backend/controllers/earningsController.js:9, 46, 148, 184`

All four earnings endpoints (`getEarningsSummary`, `getTransactions`, `getAnalytics`, `requestPayout`) return invented numbers. `requestPayout` validates against a hardcoded `availableBalance = 12550.0`. Hosts see fabricated earnings.

**Fix:** Implement real DB queries against the `Payment`/`Booking` tables, or gate with HTTP 503 until ready.

---

### H11. `confirmPayment` has no input validation — throws TypeError on undefined input
**File:** `backend/routes/payments.js:19-23`, `paymentsController.js:121`

No `validateBody` middleware. If `paymentIntentId` is undefined, `paymentIntentId.startsWith('cash_')` throws `TypeError` which falls through to the unhandled 500 path.

**Fix:** Add `validateBody` middleware with a schema requiring `paymentIntentId` as a non-empty string.

---

### H12. `error.message` sent directly in 500 responses — leaks internals
**Files:** `paymentsController.js:108,256,318,358`, `marketplaceController.js:134,237,616,851`, `authController.js:54,141,169,182` (and broadly across all controllers)

Leaks Prisma error codes, table names, stack fragments, and internal config to clients.

**Fix:** Replace ad-hoc `res.status(500).json({ error: error.message })` with `next(error)` — the global `errorHandler` middleware already handles this safely and is never used by any controller.

---

### H13. Listing photo upload has no ownership check (IDOR)
**File:** `backend/controllers/marketplaceController.js:141-182`

`getListingPhotoUploadUrl` and `confirmListingPhotoUpload` never verify `slot.ownerId === req.user.id`. Any authenticated user can attach photos to any listing they don't own.

**Fix:** Add ownership check after slot lookup (same pattern as `mediaController.js:53-63`).

---

### H14. Host can book their own parking slot
**File:** `backend/controllers/marketplaceController.js:651-853`

No check that `ownerId !== userId`. A host can book their own slot, inflating metrics.

**Fix:** Add `if (slot.ownerId === req.user.id) return res.status(400).json(...)` after slot lookup.

---

### H15. `getZones()` fetches all zones including inactive ones
**File:** `frontend/mobile/src/services/api.ts:369`

Mobile API sends no query params to `GET /analytics/zones`. Backend defaults `isActive` to true in the schema but the query filter only applies when the param is sent. AppNavigator passes all zones including inactive ones to the geofence service.

**Fix:**
```javascript
getZones: (isActive = true) => api.get('/analytics/zones', { params: { isActive } }),
// Call as: analyticsAPI.getZones(true)
```

---

## MEDIUM — Fix Before Public Launch

| # | Issue | File:Line |
|---|-------|-----------|
| M1 | `addPaymentMethod` and `deletePaymentMethod` still return 501 — listed as fixed in CLAUDE_OPINION_REQUEST but not actually implemented | `userController.js:170-200` |
| M2 | `requestPayout` validates against hardcoded `availableBalance = 12550.0` | `earningsController.js:184-217` |
| M3 | `qrCheckIn` has no geofence/location check — stolen QR code works from anywhere | `marketplaceController.js:881-981` |
| M4 | Activity tracking interval runs forever if API calls fail — battery drain | `analytics.ts:106-123` |
| M5 | `stopTracking()` doesn't clear `locationSubscription` | `analytics.ts:132-138` |
| M6 | Vehicle plate lookup is global — "already registered" leaks plate existence across users | `vehiclesController.js:84-89` |
| M7 | `safeJsonParse` whitespace heuristic is wrong — breaks amenity parsing silently | `marketplaceController.js:8-20` |
| M8 | `asyncHandler` exported but never used — all controllers write ad-hoc 500 paths | `middleware/errorHandler.js:123` |
| M9 | Google OAuth creates users with role `'driver'` but system uses `'user'`/`'host'`/`'admin'` | `googleAuthController.js:81` |
| M10 | 47 `console.log` statements left in production code (39 mobile, 8 backend) | Multiple files |
| M11 | `bookingSlice.ts:21-41` — `JSON.parse` calls not individually try-caught | `bookingSlice.ts:21-41` |
| M12 | Duplicate booking creation logic in `PaymentScreen.tsx` — cash/card paths are nearly identical | `PaymentScreen.tsx:50-172` |
| M13 | `analyticsSlice.ts` imports from `../../services/api` but `analyticsApi.ts` exists and is more specific | `analyticsSlice.ts:3` |
| M14 | `authenticate` middleware returns `{ error: 'No token provided' }` — inconsistent with API shape | `services/auth.js:38-54` |
| M15 | Hardcoded personal LAN IPs in CORS allowlist | `index.js:92-94` |
| M16 | 71 `any` type usages across mobile screens, slices, services | Multiple files |
| M17 | `marketplaceController.js` is 2,187 lines — `searchListings`, `createBooking`, `qrCheckOut` each 200-330 lines | `marketplaceController.js` |
| M18 | `extendBooking` conflict check and update not in a transaction (same TOCTOU as H5) | `marketplaceController.js:2099-2139` |

---

## Already Clean ✓

- Dead code removed: `DesignSystem.tsx`, `SearchFilters.tsx`, `parkingSlice.ts` — all gone
- No `@ts-ignore` or `@ts-nocheck` suppressions anywhere
- Auto-release cron job (30min grace period) properly implemented
- Prisma schema clean — no TODOs or placeholder fields
- Navigation fully registered — all 25 screens present
- `AnalyticsOptInModal` properly wired into `AppNavigator` — fires once, respects AsyncStorage flag
- Geofencing hook cleanup on unmount ✓
- Bcrypt + HIBP password validation solid ✓
- Joi validation schemas cover most routes ✓
- `errorHandler.js` well-structured (just not used by controllers)

---

## Recommended Fix Order for Kilo Code

### Sprint 1 — Security (Do This First)
1. **`routes/analytics.js`** — Add `authenticate` to all 7 routes, derive `userId` from `req.user.id` (C1)
2. **`index.js` + `paymongo.js` + `paymentsController.js`** — Fix webhook raw body + always require signature (C2, C3)
3. **`routes/marketplace.js:725`** — Remove unauthenticated check-expired endpoint (C4)
4. **`paymentsController.js:31-38`** — Replace forgeable cash intent ID with server-issued token (C5)
5. **`marketplaceController.js:2046`** — Verify PayMongo intent status before marking extension paid (C6)

### Sprint 2 — High Priority Bugs
6. **`AppNavigator.tsx:61`** — Parse GeoJSON string into `Array<{lat,lon}>` for geofencePolygon (H3)
7. **`analyticsGeofenceService.ts:69`** — Set `currentZoneId` only after successful dispatch, add pending flag (H4)
8. **`mediaApi.ts:53`** — Check `response.ok` on GCS upload (H6)
9. **`googleAuthController.js:30`** — Add `aud`/`iss`/`exp` verification via `google-auth-library` (H1)
10. **`routes/config.js:25`** — Add `authenticate` to Maps API key endpoint (H2)
11. **`hooks/useAnalyticsGeofencing.ts`** — Remove file entirely, use service (H9)

### Sprint 3 — Data Integrity
12. **`earningsController.js`** — Replace mock data with real DB queries (H10)
13. **`marketplaceController.js:665,782`** — Wrap booking creation in `prisma.$transaction` (H5)
14. **`marketplaceController.js:141`** — Add ownership check to photo upload endpoints (H13)
15. **`userController.js:170-200`** — Actually implement payment methods or remove endpoints (M1)

### Sprint 4 — Polish
16. Replace `AsyncStorage` with `expo-secure-store` for JWT (H7)
17. Remove 47 `console.log` statements (M10)
18. Replace all controller `res.status(500)` with `next(error)` using `asyncHandler` (H12, M8)
19. Fix `analyticsSlice.ts` import path (M13)
20. Fix `getZones()` to pass `isActive=true` param (H15)

---

## Phase 6B Deferred Tasks (Unchanged)

1. **Settings toggle for analytics opt-in** — Add to `SecurityPrivacyScreen.tsx`. Toggle reads `analytics.optedIn` from Redux, dispatches `setAnalyticsOptIn`.
2. **Zone availability circle overlays on ExploreMap** — Render `<Circle>` per zone from `analyticsAPI.getZones()`, color-coded by occupancy. Fetch on mount in ExploreMap, not just in AppNavigator.
3. **Background location tracking** — Use `expo-task-manager` (already installed) + `Location.startLocationUpdatesAsync()`. Do not start until App Store background location entitlement is approved.

---

## Files Needing Immediate Attention

| File | Issues |
|------|--------|
| `backend/routes/analytics.js` | C1 — missing auth on every route |
| `backend/controllers/paymentsController.js` | C5, H8, H11, H12 |
| `backend/services/paymongo.js` | C2, C3 — webhook verification |
| `backend/index.js` | C3 — global JSON parser before webhook route |
| `backend/controllers/marketplaceController.js` | C6, H5, H13, H14, M3, M7, M17 |
| `backend/controllers/earningsController.js` | H10, M2 — all mock data |
| `frontend/mobile/src/navigation/AppNavigator.tsx` | H3 — geofencePolygon parsing |
| `frontend/mobile/src/services/analyticsGeofenceService.ts` | H4 — race condition |
| `frontend/mobile/src/services/mediaApi.ts` | H6 — unchecked GCS upload |
| `frontend/mobile/src/hooks/useAnalyticsGeofencing.ts` | H9 — remove this file |

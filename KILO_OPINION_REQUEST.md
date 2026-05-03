# ParkPal — Kilo Audit (Minimal)

**Branch:** feature/analytics-backend | **Last verified:** May 2, 2026

## Critical — All Fixed ✅
| ID | Item | File:Line |
|----|------|-----------|
| C1 | authenticate on all 7 analytics routes, userId from req.user.id | routes/analytics.js |
| C2+C3 | Webhook raw body + HMAC always enforced, NODE_ENV gate removed | paymentsController.js:458, index.js |
| C4 | Unauthenticated check-expired endpoint removed | routes/analytics.js |
| C5 | Cash payment token = crypto.randomBytes(32) | paymentsController.js |
| C6 | extendBooking verifies PayMongo intent status | marketplaceController.js |

## High — All Fixed ✅
| ID | Item | File:Line |
|----|------|-----------|
| H1 | Google OAuth audience verification (google-auth-library) | googleAuthController.js:30-35 |
| H2 | Maps API key behind authenticate | routes/config.js:26-29 |
| H3 | geofencePolygon GeoJSON parsed correctly | AppNavigator.tsx:61-66 |
| H4 | analyticsGeofenceService pendingZoneEntry race fix | analyticsGeofenceService.ts:69-96 |
| H5 | Booking creation in prisma.$transaction | marketplaceController.js:813 |
| H6 | GCS upload checks response.ok | mediaApi.ts:70-72 |
| H7 | JWT in expo-secure-store | api.ts:22, mediaApi.ts:34 |
| H8 | getUserPayments explicit select (no clientKey/intentId) | paymentsController.js:400-419 |
| H9 | useAnalyticsGeofencing.ts deleted | (file removed) |
| H10 | Earnings: real Prisma aggregations, no mock data | earningsController.js |
| H11 | /payments/confirm has validateBody(confirmPaymentSchema) | routes/payments.js (fixed by Claude) |
| H12 | asyncHandler + next(error) across controllers | authController.js, vehiclesController.js |
| H13 | Photo upload checks slot.ownerId === req.user.id | marketplaceController.js:151-161,187-197 |
| H14 | Host self-booking blocked (ownerId !== userId) | marketplaceController.js:761-763 |
| H15 | getZones passes isActive param + correct analyticsSlice import | api.ts:369, analyticsSlice.ts:3 |

## Medium — Status
| ID | Item | Status |
|----|------|--------|
| M1 | addPaymentMethod/deletePaymentMethod 501 | ✅ Endpoints removed |
| M2 | requestPayout hardcoded balance | ✅ Real DB calc |
| M3 | qrCheckIn no location check | ✅ Location validation added |
| M4 | Activity interval infinite loop | ✅ MAX_CONSECUTIVE_ERRORS circuit breaker |
| M5 | stopTracking cleanup | ✅ Fixed |
| M6 | License plate cross-user leak | ✅ userId check added |
| M7 | safeJsonParse whitespace heuristic | ✅ Removed (fixed by Claude) |
| M8 | asyncHandler adoption | ✅ (H12) |
| M9 | Google OAuth role 'driver' | ✅ Changed to 'user' |
| M10 | console.log statements (52 mobile + 29 backend) | ✅ Removed |
| M11 | bookingSlice unguarded JSON.parse | ✅ try-catch added (fixed by Claude) |
| M12 | Duplicate booking logic in PaymentScreen | ✅ Extracted to function |
| M13 | analyticsSlice wrong import | ✅ (H15) |
| M14 | authenticate inconsistent error shape | ✅ next(error) pattern |
| M15 | Hardcoded LAN IPs in CORS | ✅ Removed |
| M16 | 71 `any` type usages | ❌ Not fixed |
| M17 | marketplaceController.js 2187 lines | ❌ Not refactored |
| M18 | extendBooking no transaction | ✅ prisma.$transaction |

## Remaining Work
- M16 + M17: deferred (low priority before beta)

## Phase 6B (Deferred — do not start)
1. SecurityPrivacyScreen analytics opt-in toggle (Redux setAnalyticsOptIn)
2. notifications.ts registerPushToken() — POST token to backend
3. Background location — expo-task-manager (needs App Store entitlement first)
4. Email verification — backend endpoint + mobile flow missing entirely

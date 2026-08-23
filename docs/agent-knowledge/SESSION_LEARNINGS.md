# Session Learnings

Curated implementation lessons for ParkPal agents. Keep entries short,
reviewable, and tied to completed work. This file is an index source, not a
replacement for reading live code before edits.

## 2026-05-23 - Payment and Mobile Workflow Lessons

### React Hook Order Before Early Returns

- Hooks such as `useStatusBarStyle()` must be called before conditional early
 returns in React Native screens.
- This matters for screens like `frontend/mobile/src/screens/QRScannerScreen.tsx`
 where permission, loading, or unsupported-state branches can otherwise change
 hook order between renders.
- Known failure pattern: React reports a hook-order change or crashes after a
 state transition into an early-return branch.

### Cash Booking Payment Flow

- Cash bookings should still follow the canonical booking/payment intent
 confirmation path instead of bypassing backend confirmation semantics.
- Route cash payment failures to `PaymentFailed` so users land in the same
 recoverable failure flow as other payment methods.
- Relevant files include `frontend/mobile/src/screens/PaymentScreen.tsx`,
 `frontend/mobile/src/screens/PaymentFailedScreen.tsx`,
 `backend/controllers/paymentsController.js`, `backend/routes/payments.js`,
 `backend/services/paymongo.js`, and `backend/tests/payments.test.js`.
- Known failure pattern: cash booking confirmation returns a 403 or failed modal
 instead of a confirmed booking or the canonical failure route.

### Mobile Payment UI Consistency

- Payment screens should use `MaterialCommunityIcons` for payment method and
 action visuals.
- Avoid emoji or native-looking placeholder icons on payment screens because
 they drift from the rest of the mobile UI system.
- Relevant files include `frontend/mobile/src/screens/PaymentScreen.tsx`,
 `frontend/mobile/src/screens/PaymentMethodsScreen.tsx`, and
 `frontend/mobile/src/screens/PaymentFailedScreen.tsx`.

### Verification Notes

- Mobile TypeScript is expected to pass locally after payment-screen and QR
 scanner changes.
- Backend payment tests may depend on a working local Postgres database and
 seeded/test data. Treat local Postgres failures as environment evidence before
 changing app behavior.

## 2026-05-25 - Recent Hot Path Lessons

### Mobile List Loading and Failure States

- Use `frontend/mobile/src/components/ListState.tsx` for shared list skeletons,
 empty states, and retryable failures across core mobile list screens.
- Gate full-screen loading and failure states on first-load-empty conditions;
 preserve refresh behavior when `MyListings`, `MyBookings`, `MyVehicles`,
 `PointsHistory`, or `HomeDashboard` already has content.
- Focused coverage lives in
 `frontend/mobile/src/__tests__/components/ListState.test.tsx`,
 `frontend/mobile/src/__tests__/screens/MyListingsScreen.states.test.tsx`, and
 `frontend/mobile/src/__tests__/screens/CoreListStates.test.tsx`.
- Validation: `cd frontend/mobile && npm test -- --runTestsByPath src/__tests__/components/ListState.test.tsx src/__tests__/screens/MyListingsScreen.states.test.tsx src/__tests__/screens/CoreListStates.test.tsx --no-watchman`.

### Google Parking Candidate Scans

- Google Places candidate discovery is an additive admin/review workflow, not
 live ParkPal availability. Candidate preview pins must remain non-bookable and
 avoid pricing, occupancy, or availability guarantees.
- Start with `backend/controllers/adminController.js`,
 `backend/routes/admin.js`, `backend/validators/admin.js`,
 `backend/services/parkingCandidateScanService.js`, and
 `backend/services/parkingCandidateScanScheduler.js` before scanning broad
 analytics docs.
- Scheduled Google parking scans should stay disabled unless the user explicitly
 broadens quota and operations scope; use one small manual admin scan for local
 validation.
- Validation: `cd backend && npm test -- parkingCandidates.routes.test.js parkingCandidates.unit.test.js parkingCandidateScheduler.test.js`.

### Backend Local DB and Test Recovery

- A local `401 Invalid credentials` can mean seeded users are missing, the app
 is pointed at the wrong Postgres database, or seed data drifted; verify
 `DATABASE_URL` and seed state before changing auth behavior.
- Start recovery with `backend/prisma/seed.js`, `backend/test/setup.js`,
 `backend/test/helpers.js`, `backend/tests/setup.js`, and auth-focused tests.
- Validation: `cd backend && npm test -- auth.test.js password-reset.test.js googleAuth.test.js`; run `cd backend && npm run seed` only when intentionally reseeding local data.

### Startup Token Tooling

- Plain startup remains `AGENTS.md` plus `knowledge:context --limit 1`, git
 status, and latest commit only. Do not add broad suggested reads to compact
 context output.
- Runtime `knowledge:build` and `knowledge:rebuild-if-stale` should rebuild the
 SQLite DB from generated compact records without rewriting tracked
 `.agents/knowledge/compact/*.jsonl` files.
- Use `npm run knowledge:compact -- --check` as the tracked mirror freshness
 guard; run `npm run knowledge:compact` only when intentionally updating those
 mirrors.

## 2026-05-26 - Listing Create Media Upload Lessons

### My Listings Add Listing 400 With Photos

- Symptom: adding a listing from My Listings or List Your Spot can return a 400
 when selected photos are included.
- Cause: React Native image picker returns local `file://` URIs, but the backend
 create-listing validator accepts `photos` only as URL strings.
- Fix: create the listing without local photos, upload local photos after the
 listing id exists, update the listing with uploaded URLs, and surface backend
 Joi validation details in the submit error.
- Future routing hint: start at
 `frontend/mobile/src/screens/ListYourSpot.tsx`,
 `frontend/mobile/src/utils/listingForm.ts`,
 `frontend/mobile/src/store/slices/marketplaceSlice.ts`,
 `frontend/mobile/src/services/api.ts`,
 `backend/validators/marketplace.js`, and
 `backend/controllers/marketplaceController.js`, not
 `frontend/mobile/src/screens/MyListingsScreen.tsx` alone.

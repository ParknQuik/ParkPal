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

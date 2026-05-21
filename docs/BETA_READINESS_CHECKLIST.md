# Beta Readiness Checklist

**Last Updated:** May 21, 2026
**Status:** Not ready for beta
**Baseline:** `dev` at `171a1d0` after PR #139; PR #130 remains closed as superseded

This checklist tracks the minimum evidence needed before ParknQuik moves from active development into beta distribution. App-store submission stays deferred until every required item below is either complete or explicitly waived.

## Current Validation Evidence

| Area | Latest Evidence | Beta Impact |
|------|-----------------|-------------|
| PR queue | No open PRs against `dev` after PR #139 merged; PR #130 remains closed as superseded | No stale branch should be merged into beta baseline |
| Git hygiene | `git diff --check` passed for PR #137 refresh and PR #139 status reconciliation on May 21, 2026 | Formatting whitespace is clean |
| Web tests | GitHub Frontend Web Tests passed for PR #138, PR #137, and PR #139 on May 21, 2026; latest local web run remains 79/85 passing on May 17, 2026 | Refresh local web evidence before beta readiness claims are raised |
| Mobile tests | `frontend/mobile npm test -- --runInBand --watchman=false`: 33/33 passing locally on May 21, 2026; GitHub Frontend Mobile Checks passed for PR #138, PR #137, and PR #139 | Current automated mobile unit coverage is green |
| Mobile TypeScript | `npx tsc --noEmit` still fails in known pre-existing areas: `src/navigation/types.ts` and `src/screens/MyBookingsScreen.tsx` | Resolve before beta or explicitly risk-accept |
| Backend tests | GitHub Backend Tests passed for PR #138, PR #137, and PR #139 on May 21, 2026; latest local full-suite evidence still depends on PostgreSQL availability | Need a working local test database before replacing historical local pass-rate claims |
| Backend Cloud Run health | Last direct `/health` evidence remains May 17, 2026: HTTP 503 degraded from the database check; Redis and Secret Manager were up | Backend health must be rechecked and non-degraded before beta |
| Web Cloud Run | Web service previously returned HTTP 200 | Recheck before beta evidence is signed off |
| API docs | `/api-docs/` previously returned HTTP 200 after redirect | Recheck before beta evidence is signed off |

## Required Before Beta

### Mobile Build Readiness

- [ ] Confirm `frontend/mobile/eas.json` profiles match dev, preview, and production backend targets.
- [ ] Create fresh iOS and Android internal builds from current `dev`.
- [ ] Run smoke tests on at least one iOS device or simulator and one Android device or emulator.
- [ ] Verify auth, booking creation, booking cancellation, listing creation, image selection/upload, map search, and push-notification fallback in a development build.
- [ ] Capture build numbers, commit SHA, device matrix, and known issues in `STATUS_REPORT.md`.

### Payments

- [ ] Verify PayMongo sandbox keys are configured in Secret Manager for the beta environment.
- [ ] Run successful payment flows for GCash, card, GrabPay, Maya, and cash-at-location where supported.
- [ ] Run failed, cancelled, expired, and duplicate payment scenarios.
- [ ] Confirm webhook signature verification and booking/payment state reconciliation.
- [ ] Document any payment method intentionally disabled for beta.

### Email

- [ ] Re-verify transactional delivery for password reset, booking confirmation, booking cancellation, and host/renter notifications.
- [ ] Confirm sender domain and reply-to configuration for `parknquik.com`.
- [ ] Verify email failures are logged without blocking the booking flow.
- [ ] Confirm rate limits and abuse controls for password reset.

### Maps And Location

- [ ] Confirm Google Maps keys are present for backend, web, iOS, and Android surfaces.
- [ ] Verify key restrictions for each platform before distributing builds.
- [ ] Run location permission flows on iOS and Android.
- [ ] Verify search, directions deep links, zone overlays, clustering, and offline fallback behavior.
- [ ] Confirm no hardcoded LAN IPs or local-only map endpoints remain in beta builds.

### Monitoring And Operations

- [ ] Confirm Cloud Run backend and web logs are visible in GCP.
- [ ] Add or verify alerts for backend 5xx rate, Cloud SQL availability, payment webhook failures, and email delivery failures.
- [ ] Confirm cost alerts remain active.
- [ ] Define beta incident owner, triage channel, and rollback procedure.
- [ ] Record a health-check run where backend, web, API docs, database, Secret Manager, and email are all healthy.

### Redis Deferral

- [ ] Decide whether Redis remains deferred for beta or becomes required.
- [ ] If deferred, document which features run without Redis and which performance risks are accepted.
- [ ] If required, provision Redis, configure `REDIS_URL`, and rerun backend tests and health checks.

### App Store Submission Prerequisites

- [ ] Prepare App Store Connect and Google Play Console app records.
- [ ] Prepare privacy policy, terms of service, support URL, and data-safety disclosures.
- [ ] Create final app icons, splash screens, screenshots, and store descriptions.
- [ ] Confirm bundle IDs/package names, signing credentials, and release channels.
- [ ] Submit only after the beta evidence above is complete and approved.

## Release Gate

Beta can proceed only when:

- No stale PRs are pending against `dev`.
- Web, mobile, and backend validation are green or explicitly risk-accepted.
- Cloud Run backend health is non-degraded.
- Payments, email, maps, and monitoring have fresh evidence.
- App-store submission assets and compliance materials are ready.

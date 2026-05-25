# Beta Readiness Checklist

**Last Updated:** May 25, 2026
**Status:** Future beta/deployment gate, not the active local development plan
**Baseline:** `dev` at `600a7b5` after PR #161; no open PRs against `dev` as of May 25, 2026

This checklist tracks the minimum evidence needed before ParknQuik moves from local-first active development into GCP-backed beta distribution. The existing local development setup remains the proof-of-concept baseline; GCP/Cloud Run validation and app-store submission stay deferred until every required item below is either complete or explicitly waived.

## Current Validation Evidence

| Area | Latest Evidence | Beta Impact |
|------|-----------------|-------------|
| PR queue | `gh pr list --base dev --state open --json number,title,headRefName,updatedAt`: no open PRs against `dev` on May 25, 2026 | PR queue is clear for the current local-first baseline |
| Git hygiene | `git diff --check` passed locally on May 25, 2026 | Formatting whitespace is clean |
| Web tests | `frontend/web npm test -- --run`: 85/85 passing locally on May 25, 2026 after PR #161 stabilized Vitest timeouts; GitHub Frontend Web Tests passed for PR #161 on May 25, 2026 | Current local and CI web coverage is green |
| Mobile tests | `frontend/mobile npx tsc --noEmit`: passing locally on May 25, 2026; `npm --prefix frontend/mobile test -- --runInBand --no-watchman`: 56/56 passing locally on May 25, 2026; targeted booking tests remain 9/9 passing on May 22, 2026 | Current automated mobile coverage is green |
| Mobile TypeScript | Previous drift in `src/navigation/types.ts` and `src/screens/MyBookingsScreen.tsx` is resolved; latest mobile TypeScript passed locally on May 25, 2026 | No known mobile TypeScript blocker remains for beta |
| Backend tests | `backend GCS_BUCKET_NAME=test-bucket npm test -- --runInBand --no-watchman`: 25 suites passed, 494/496 tests passed with 2 skipped locally on May 25, 2026; GitHub Backend Tests passed for PR #161 on May 25, 2026 | Current local backend suite is green against the existing local development setup |
| Backend Cloud Run health | Last direct `/health` evidence remains May 17, 2026: HTTP 503 degraded from the database check; Redis and Secret Manager were up | Recheck before GCP deployment/beta evidence is signed off |
| Web Cloud Run | Web service previously returned HTTP 200 | Recheck before GCP deployment/beta evidence is signed off |
| API docs | `/api-docs/` previously returned HTTP 200 after redirect | Recheck before GCP deployment/beta evidence is signed off |

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

- [ ] Before GCP deployment/beta, confirm Cloud Run backend and web logs are visible in GCP.
- [ ] Add or verify alerts for backend 5xx rate, Cloud SQL availability, payment webhook failures, and email delivery failures.
- [ ] Confirm cost alerts remain active.
- [ ] Define beta incident owner, triage channel, and rollback procedure.
- [ ] Record a health-check run where backend, web, API docs, database, Secret Manager, and email are all healthy.

### Redis Deferral

- [x] Redis remains deferred during current local-first stabilization.
- [ ] Revisit Redis only when scale or a concrete feature requirement makes it necessary.
- [ ] Before beta, document which features run without Redis and which performance risks are accepted.

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
- Cloud Run backend health is non-degraded before GCP deployment/beta.
- Payments, email, maps, and monitoring have fresh evidence.
- App-store submission assets and compliance materials are ready.

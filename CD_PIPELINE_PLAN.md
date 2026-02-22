# ParkPal CD/CI Pipeline Plan

**Created:** February 23, 2026
**Status:** Planning Phase
**Timeline:** 2-3 hours implementation

---

## 📋 Executive Summary

Create automated CD/CI pipelines for ParkPal to eliminate manual deployments and ensure consistent, reliable releases across dev/staging/production environments.

**Current State:**
- ✅ CI exists: PR checks, test coverage, security scans
- ❌ CD missing: Manual `gcloud` commands for deployment
- ✅ Infrastructure ready: Cloud Run, Cloud SQL, Secret Manager

**Proposed Solution:**
- Automated deployments via GitHub Actions
- Environment-specific configurations (dev/staging/prod)
- Database migrations as part of deployment
- Health checks and deployment verification

---

## 🏗️ Architecture Overview

### Current CI Workflows (Existing)

1. **pr-checks.yml** - Runs on PRs to main/dev/qa
   - PR title validation (conventional commits)
   - Backend tests (PostgreSQL + Redis services)
   - Frontend web tests
   - Frontend mobile checks
   - Security scans (npm audit + TruffleHog)
   - Code quality checks
   - PR size validation
   - Branch flow enforcement (feature → dev → qa → main)

2. **test-coverage.yml** - Test coverage reporting
3. **performance-testing.yml** - Performance benchmarks
4. **mobile-eas-build.yml** - EAS mobile builds
5. **mobile-env-check.yml** - Mobile environment validation

### Proposed CD Workflows (New)

#### 1. Backend Deployment (`deploy-backend.yml`)

**Trigger:**
- Push to `dev`, `qa`, `main` branches (backend/** changes)
- Manual workflow dispatch

**Steps:**
1. Determine environment (dev/staging/production)
2. Authenticate to GCP (Workload Identity Federation)
3. Build Docker image with Prisma
4. Push to Google Container Registry
5. Run database migrations (Prisma migrate deploy)
6. Deploy to Cloud Run
7. Health check verification
8. Rollback on failure

**Environment Configuration:**

| Branch | Environment | Service Name | Min Instances | Max Instances | Memory | CPU |
|--------|-------------|--------------|---------------|---------------|--------|-----|
| dev    | development | parkpal-backend-dev | 0 | 5 | 512Mi | 1 |
| qa     | staging     | parkpal-backend-staging | 0 | 10 | 512Mi | 1 |
| main   | production  | parkpal-backend-prod | 1 | 100 | 1Gi | 2 |

#### 2. Frontend Web Deployment (`deploy-web.yml`)

**Trigger:**
- Push to `dev`, `qa`, `main` branches (frontend/web/** changes)
- Manual workflow dispatch

**Steps:**
1. Build Next.js app with environment variables
2. Deploy to Firebase Hosting (environment-specific channels)
3. Preview URL generation
4. Lighthouse performance check

#### 3. Mobile App Deployment (`deploy-mobile.yml`)

**Trigger:**
- Manual workflow dispatch (EAS builds are slow)
- Tagged releases (v*)

**Steps:**
1. Increment version number
2. Build via EAS (iOS + Android)
3. Submit to TestFlight/Internal Testing
4. Generate QR codes for testing

---

## 🔐 Security Considerations

### Authentication Strategy

**Recommended: Workload Identity Federation (WIF)**
- ✅ No service account keys in GitHub secrets
- ✅ Short-lived tokens (1 hour)
- ✅ Least privilege (only GitHub Actions can assume role)
- ✅ Audit trail in GCP logs

**Alternative: Service Account Key (Current)**
- ⚠️ Long-lived credentials
- ⚠️ Manual rotation required
- ✅ Simpler setup
- ✅ Works immediately

**Decision:** Start with Service Account Key, migrate to WIF later.

### Required GitHub Secrets

**Organization/Repository Level:**
```
GCP_SA_KEY                 # Service account JSON key
GCP_PROJECT_ID             # parkpal-474417
```

**Environment-Specific (dev/staging/production):**
```
# Not needed - secrets stored in GCP Secret Manager
# Backend reads from Secret Manager at runtime
```

### GitHub Environment Protection Rules

**Development:**
- ✅ Auto-deploy on push to `dev`
- ❌ No approvals required

**Staging:**
- ✅ Auto-deploy on push to `qa`
- ⚠️ Optional: 1 reviewer approval

**Production:**
- ✅ Auto-deploy on push to `main`
- ✅ Required: 2 reviewer approvals
- ✅ Deployment window: Business hours only
- ✅ Wait timer: 5 minutes (allow cancellation)

### IAM Permissions Required

**Service Account:** `parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com`

**Roles:**
```
roles/run.admin                    # Deploy Cloud Run services
roles/iam.serviceAccountUser       # Act as service account
roles/cloudsql.client              # Connect to Cloud SQL
roles/secretmanager.secretAccessor # Read secrets
roles/storage.admin                # Manage GCS buckets
roles/cloudbuild.builds.editor     # Create Cloud Build jobs (for migrations)
roles/logging.logWriter            # Write deployment logs
```

---

## 🚀 Implementation Plan

### Phase 1: Backend CD Pipeline (1 hour)

1. **Create service account key** (5 min)
   ```bash
   gcloud iam service-accounts keys create parkpal-sa-key.json \
     --iam-account=parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com

   # Base64 encode for GitHub secrets
   cat parkpal-sa-key.json | base64
   ```

2. **Add GitHub secrets** (5 min)
   - Navigate to repo Settings → Secrets and variables → Actions
   - Add `GCP_SA_KEY` (base64-encoded JSON)
   - Add `GCP_PROJECT_ID` = `parkpal-474417`

3. **Create GitHub Environments** (10 min)
   - Create `development`, `staging`, `production` environments
   - Add protection rules (production: 2 reviewers)

4. **Create `deploy-backend.yml` workflow** (20 min)
   - Copy template (already drafted)
   - Test with dev branch

5. **Verify deployment** (20 min)
   - Push to `dev` branch
   - Monitor GitHub Actions logs
   - Test health endpoint
   - Verify logs in GCP Cloud Logging

### Phase 2: Frontend Web CD Pipeline (30 min)

1. **Setup Firebase CLI token** (10 min)
   ```bash
   firebase login:ci
   # Add token as FIREBASE_TOKEN secret
   ```

2. **Create `deploy-web.yml` workflow** (15 min)

3. **Test deployment** (5 min)

### Phase 3: Mobile CD Pipeline (30 min)

1. **Configure EAS credentials** (15 min)
   - Add `EXPO_TOKEN` secret
   - Configure app.json for environments

2. **Create `deploy-mobile.yml` workflow** (10 min)

3. **Test build** (5 min - actual build takes 15-20 min)

### Phase 4: Documentation & Rollback Strategy (30 min)

1. **Document deployment process** (15 min)
2. **Create rollback runbook** (10 min)
3. **Train team on CD pipeline** (5 min)

---

## 📊 Deployment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Developer Workflow                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌─────────┐  ┌─────────┐  ┌─────────┐
              │   dev   │  │   qa    │  │  main   │
              │ branch  │  │ branch  │  │ branch  │
              └────┬────┘  └────┬────┘  └────┬────┘
                   │            │            │
         ┌─────────┼────────────┼────────────┼─────────┐
         │         │            │            │         │
         │    Auto-Deploy  Auto-Deploy  Auto-Deploy   │
         │         │            │            │         │
         ▼         ▼            ▼            ▼         ▼
┌──────────────────────────────────────────────────────────┐
│              GitHub Actions Workflows                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  1. Build Docker Image (Prisma + Node.js)                │
│  2. Push to GCR (gcr.io/parkpal-474417/*)                │
│  3. Run Database Migrations (Cloud Run Job)              │
│  4. Deploy to Cloud Run                                  │
│  5. Health Check (GET /health)                           │
│  6. Notify (PR comment / Slack)                          │
│                                                           │
└──────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
         ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
         │ Development  │ │   Staging    │ │ Production   │
         ├──────────────┤ ├──────────────┤ ├──────────────┤
         │ parkpal-     │ │ parkpal-     │ │ parkpal-     │
         │ backend-dev  │ │ backend-     │ │ backend-prod │
         │              │ │ staging      │ │              │
         │ Min: 0       │ │ Min: 0       │ │ Min: 1       │
         │ Max: 5       │ │ Max: 10      │ │ Max: 100     │
         └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 🧪 Testing Strategy

### Pre-Deployment Tests (CI)
- ✅ Unit tests (234 backend, 45 mobile)
- ✅ Integration tests (PostgreSQL + Redis)
- ✅ Security scans (npm audit, TruffleHog)
- ✅ Code quality checks

### Post-Deployment Tests (CD)
- ✅ Health check (GET /health returns 200)
- ✅ Smoke tests (critical endpoints)
- ⚠️ E2E tests (future: Playwright/Cypress)

### Rollback Triggers
- ❌ Health check fails
- ❌ Error rate > 5%
- ❌ Response time > 3s (p95)
- ❌ Database migration fails

### Rollback Process
```bash
# Automatic rollback via Cloud Run revisions
gcloud run services update-traffic parkpal-backend-prod \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=asia-southeast1

# Manual rollback if needed
gcloud run revisions list --service=parkpal-backend-prod --region=asia-southeast1
gcloud run services update-traffic parkpal-backend-prod \
  --to-revisions=parkpal-backend-prod-00042-abc=100 \
  --region=asia-southeast1
```

---

## 💰 Cost Impact

**GitHub Actions:**
- Free tier: 2,000 minutes/month (private repos)
- Each deployment: ~5 minutes
- Max deployments/month: 400 (well within limit)

**GCP Cloud Build:**
- Free tier: 120 build-minutes/day
- Each build: ~3 minutes
- Max builds/day: 40 (more than enough)

**Total Additional Cost:** $0 (within free tiers)

---

## 📈 Success Metrics

### Deployment Frequency
- **Before:** Manual, ~2-3 times/week
- **After:** Automated, 10-20 times/week

### Lead Time
- **Before:** 30 minutes (manual gcloud commands)
- **After:** 5 minutes (automated pipeline)

### Mean Time to Recovery (MTTR)
- **Target:** < 5 minutes (automated rollback)

### Change Failure Rate
- **Target:** < 5% (health checks catch issues)

---

## 🔄 Migration Path

### Week 1: Backend CD (This week)
1. Create service account key
2. Add GitHub secrets
3. Create environments
4. Deploy workflow to dev branch
5. Test with dev deployments (3-5 times)
6. Monitor for issues

### Week 2: Expand to Staging/Production
1. Test qa branch deployments
2. Add production protection rules
3. First production deployment (supervised)

### Week 3: Frontend CD
1. Firebase Hosting automation
2. Preview deployments for PRs

### Week 4: Mobile CD
1. EAS build automation
2. TestFlight/Internal Testing automation

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Database migration failure breaks prod | High | Low | Test migrations in dev/staging first; keep rollback SQL |
| Secrets exposed in logs | High | Medium | Use `--set-secrets` flag (not env vars); mask in logs |
| Deployment during high traffic | Medium | Low | Production requires approval + wait timer |
| Cloud Run cold starts | Medium | High | Set min instances = 1 for production |
| GitHub Actions downtime | Medium | Low | Can manually deploy with `gcloud` commands |

---

## 📚 Related Documentation

- **MIGRATION_GUIDE.md** - 4-week migration plan (Days 3-4 complete)
- **DEPLOYMENT_PROGRESS.md** - Current infrastructure status
- **backend/Dockerfile.production** - Production Docker config
- **backend/cloudbuild.yaml** - Cloud Build configuration
- **.github/workflows/pr-checks.yml** - Existing CI pipeline

---

## ✅ Next Steps

**Immediate (Today):**
1. Review this plan with user
2. Get approval for service account key approach
3. Create GitHub secrets
4. Deploy `deploy-backend.yml` workflow
5. Test with dev branch

**This Week:**
1. Monitor dev deployments (3-5 successful runs)
2. Document any issues
3. Expand to qa branch

**Next Week:**
1. Production deployment with protection rules
2. Frontend/Mobile CD pipelines

---

**Status:** 📝 Awaiting approval to proceed with implementation
**Estimated Time:** 2-3 hours for backend CD
**Risk Level:** Low (can rollback to manual deployment)

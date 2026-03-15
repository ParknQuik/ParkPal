# Session Start Instructions

**Last Updated:** February 24, 2026
**Documentation Structure:** Streamlined (13 essential root files, 43 redundant files removed)

---

## When the user says "start"

Follow this **2-step quick context gathering** (10-15 minutes total):

### Step 1: Read Current State (5 minutes)

**Read ONLY this file:**
- **`STATUS_REPORT.md`** (renamed from JANUARY_2026_STATUS_REPORT.md)
  - Current deployment status
  - Production readiness assessment
  - Recent completions and blockers
  - Timeline to launch

**What you'll learn:**
- Backend: ✅ Deployed to Cloud Run (operational)
- Frontend: ⏳ Not deployed yet (web + mobile pending)
- Database: ✅ Connected via Cloud SQL
- Secrets: ✅ Configured in Secret Manager

---

### Step 2: Understand Infrastructure (5-10 minutes)

**Read ONLY these files:**
- **`TECH_STACK_SUMMARY.md`** (authoritative tech stack)
- **`docs/DEPLOYMENT.md`** (consolidated deployment guide)
- **`docs/PARKPAL_SYSTEM_ARCHITECTURE.md`** (two-service architecture)

**What you'll learn:**
- Tech stack: GCP Cloud Run, PostgreSQL, Redis, React Native, Vite/React
- Deployment: Backend automated via GitHub Actions, frontend pending setup
- Architecture: Service 1 (Analytics - future), Service 2 (Marketplace - current)
- Infrastructure: Cloud SQL, Secret Manager, Cloud Storage, Firebase Hosting

---

### Step 3: Check Specific Topics (As Needed)

**Read on-demand:**
- **`DOCUMENTATION_AUDIT_SUMMARY.md`** - Recent doc cleanup details
- **`docs/ENVIRONMENTS.md`** - Environment variables and configuration
- **`docs/GCP_SECRET_MANAGER_SETUP.md`** - Secret management

**What you'll learn:**
- February 2026 progress: CD pipeline operational, mobile tests passing
- Documentation cleanup: 67% reduction in files
- Next priorities: Production secrets, staging test, beta launch

---

## After Reading (1-2 minutes)

Provide a **concise summary** (3-4 sentences):

```
Example (Feb 2026):
"ParkPal is 95% production ready with Phase 5 (~80% complete). CD/CI pipeline
operational with automated deployments. All P1 blockers resolved (Photo Upload,
Forgot Password, Database). Mobile tests: 45/45 passing. Remaining: production
secrets setup, staging test, beta user recruitment. Beta launch: Feb 28, 2026."
```

Then ask: **"What would you like to work on?"**

---

## Reference Documentation (Read on-demand)

**Only read these if the user asks about specific topics:**

### Service 1 (Analytics) - In Detail
- **`docs/future-phases/SERVICE_1_ANALYTICS_GUIDE.md`**
  - How circling time works
  - Edge cases (delayed confirmations, false positives)
  - Databricks pipeline architecture
  - Implementation roadmap (Phases 6-8)
  - **Read when:** User asks about analytics, geofencing, or Service 1
  - **Note:** Phase 6 feature, not needed for Phase 5 launch

### System Architecture
- **`docs/PARKPAL_SYSTEM_ARCHITECTURE.md`**
  - Service 1 + Service 2 architecture
  - Data models
  - API design
  - Monetization strategy
  - **Read when:** User asks about overall architecture or data models

### API Documentation
- **Swagger UI at `/api-docs`** (live API documentation)
  - All 41 API endpoints documented
  - Request/response formats
  - Try-it-out functionality
  - **Read when:** User asks about API or endpoints
  - **Note:** docs/API.md was deleted (replaced by Swagger)

### Deployment
- **`docs/DEPLOYMENT.md`**
  - GCP deployment steps
  - Secret Manager setup
  - PayMongo configuration
  - Environment setup
  - **Read when:** User asks about deployment or infrastructure

### Testing
- **Backend tests:** `npm test` in `backend/` (235/271 passing)
- **Mobile tests:** `npm test` in `frontend/mobile/` (45/45 passing) ✅
- **Web tests:** `npm test` in `frontend/web/` (54/85 passing)
- **Performance testing:** Artillery, k6, Lighthouse (in `performance-testing/`)
- **Read when:** User asks about testing

---

## Quick Reference: Project Status

**Current State (Feb 24, 2026):**
- **Branch:** `dev`
- **Environment:** Development (single environment, no staging/prod yet)
- **Service:** Service 2 - P2P Parking Marketplace (Airbnb-style)
- **Service 1:** Analytics (future phase - not started)

**Deployment Status:**
- ✅ **Backend:** Deployed to Cloud Run (automated CI/CD)
  - URL: https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app
  - Database: ✅ Connected (Cloud SQL PostgreSQL)
  - Redis: ⏳ Not configured
  - Health: 🟡 Operational but degraded
- ❌ **Web Frontend:** Not deployed
  - Workflow exists but deployment step incomplete
  - Options: Firebase Hosting, Vercel, or Cloud Run
- ❌ **Mobile App:** Not deployed
  - EAS workflow exists but not on main branch
  - Not submitted to App Stores

**Feature Completion:**
- ✅ **Backend:** 167 tests, API v1, PayMongo, forgot password
- ✅ **Mobile:** 20 screens, 45/45 tests passing, payment integration
- 🟡 **Web:** 11 screens, 72% test pass rate
- ⏳ **Photo Upload:** Backend ready, GCS integration pending
- ⏳ **Email Templates:** SMTP configured, templates needed

**Critical Gaps:**
1. ❌ Web app not deployed → Users can't access web dashboard
2. ❌ Mobile app not deployed → No apps to download
3. ⏳ Redis not configured → Caching unavailable
4. ⏳ Photo upload incomplete → Hosts can't add listing photos

**Tech Stack:**
- Backend: Node.js + Express + PostgreSQL + Redis
- Mobile: React Native + Expo + Redux Toolkit
- Web: React + Next.js + Material-UI
- Analytics: Databricks on GCP + Cloud Storage
- Payments: PayMongo (GCash, Cards, GrabPay, Maya)

---

## Documentation Structure (33 Essential Files)

### Essential (Read for every session)
1. `JANUARY_2026_STATUS_REPORT.md` - Current state (95% prod ready)
2. `TECH_STACK_SUMMARY.md` - Tech stack (GCP not Azure!)
3. `CD_PIPELINE_STATUS.md` - Deployment status (100% operational)
4. `DOCUMENTATION_AUDIT_SUMMARY.md` - Recent cleanup (43 files deleted)

### Reference (Read on-demand)
5. `docs/future-phases/SERVICE_1_ANALYTICS_GUIDE.md` - Service 1 (Phase 6)
6. `docs/PARKPAL_SYSTEM_ARCHITECTURE.md` - System architecture
7. `docs/DEPLOYMENT.md` - GCP deployment guide
8. `docs/ENVIRONMENTS.md` - Environment config
9. `MIGRATION_GUIDE.md` - Day 1-5 migration guide
10. `README.md` - Project overview

### Backend Documentation (6 files)
- `backend/API_VERSIONING_GUIDE.md`
- `backend/PRISMA_STUDIO_GUIDE.md`
- `backend/PASSWORD_RESET_IMPLEMENTATION.md`
- `backend/ANALYTICS_TEST_STATUS.md`
- `backend/tests/README.md`
- `backend/docs/PHOTO_UPLOAD_IMPLEMENTATION_PLAN.md`
- `backend/docs/CI_FIXES_APPLIED.md`

### Frontend Documentation (10 files)
- `frontend/mobile/README.md`
- `frontend/mobile/PROJECT_SUMMARY.md`
- `frontend/mobile/GOOGLE_MAPS_SETUP.md`
- `frontend/mobile/PHOTO_UPLOAD_INTEGRATION.md`
- `frontend/web/README.md`
- `frontend/web/WEB_DASHBOARD_GUIDE.md`
- `frontend/web/GOOGLE_MAPS_SETUP.md`

### Audit & Implementation (7 files)
- `DOCUMENTATION_AUDIT_REPORT.md` (comprehensive)
- `DOCUMENTATION_CLEANUP_CHECKLIST.md` (execution guide)
- `DOCUMENTATION_STRUCTURE.md` (navigation)
- `docs/audits-reviews/BACKEND_SECURITY_PERFORMANCE_AUDIT.md`
- `docs/audits-reviews/COMPREHENSIVE_TESTING_ASSESSMENT.md`
- `docs/implementations/PAYMONGO_INTEGRATION_COMPLETE.md`
- `docs/implementations/TEST_INFRASTRUCTURE_FIX_SUMMARY.md`

---

## What NOT to Do

❌ **Don't** read all 47 old markdown files
❌ **Don't** read archived files in `docs/archive/`
❌ **Don't** read outdated roadmaps (they're consolidated into MASTER_ROADMAP)
❌ **Don't** spend 30+ minutes reading documentation

✅ **Do** read the 3 essential files (15-20 min)
✅ **Do** provide a quick summary
✅ **Do** ask what to work on
✅ **Do** read reference docs only when needed

---

## Git Workflow Policy

**IMPORTANT:** Always inform the user before committing or pushing changes.

### Before `git commit`:
1. Show a summary of what will be committed
2. Ask for explicit confirmation: "Ready to commit these changes?"
3. Wait for user approval before running `git commit`

### Before `git push`:
1. Inform the user about the commits to be pushed
2. Ask for explicit confirmation: "Ready to push to remote?"
3. Wait for user approval before running `git push`

### Exception:
Only commit/push automatically if the user explicitly says:
- "commit and push this"
- "go ahead and commit"
- "auto-commit"
- Or similar clear permission

---

## Git Branch Protection

**Repository Configuration:**
- **`dev` branch is PROTECTED** - requires pull requests
- **`main` branch is PROTECTED** - requires pull requests
- Direct pushes to `dev` or `main` will be rejected

### When User Says "Push to Dev" or "Merge to Dev":

**Always follow this workflow:**

1. **Create a feature branch:**
   ```bash
   git checkout -b feat/descriptive-name
   ```

2. **Commit changes to feature branch:**
   ```bash
   git add [files]
   git commit -m "descriptive message"
   git push -u origin feat/descriptive-name
   ```

3. **Create Pull Request:**
   ```bash
   gh pr create --base dev --head feat/descriptive-name --title "Title" --body "Description"
   ```

4. **Do NOT attempt:**
   - ❌ `git push origin dev` (will fail - protected branch)
   - ❌ `git checkout dev && git merge` then push (will fail - protected branch)

**Protected Branches Require:**
- Pull request workflow
- Status checks to pass (3 required checks)
- Code review (configuration dependent)

**Exception for Unprotected Branches:**
- Feature branches can be pushed directly
- Temporary/experimental branches can be pushed directly

---

## Historical Context (If Needed)

**Archived documentation** is in `docs/archive/` and includes:
- Phase completion summaries (Phases 1-4)
- PayMongo integration completion
- Security audit updates
- Testing infrastructure fixes
- Branch summaries

**Only read these if:**
- User asks about historical work
- Need to understand past decisions
- Investigating why something was done a certain way

**Otherwise:** Skip them. Current documentation is comprehensive.

---

## Example Session Start

**User:** "start"

**Assistant:**
1. Reads `JANUARY_2026_STATUS_REPORT.md` (5 min)
2. Reads `MASTER_ROADMAP_2026.md` (7 min)
3. Reads `TECH_STACK_SUMMARY.md` (3 min)

**Total: 15 minutes**

**Assistant response:**
```
ParkPal is 87% production ready (Phase 5: 40% complete). Testing
infrastructure (47 files) ready to merge will boost test pass rate to 91%.
3 P1 blockers remain: forgot password (1-2 days), photo upload (2-3 days),
and test DB setup (30 min). Service 2 (Marketplace) launches Feb 2026,
Service 1 (Analytics) launches Sep 2026.

What would you like to work on?
```

---

**Status:** ✅ Updated for streamlined documentation structure
**Next Review:** After Phase 5 launch (Feb 2026)

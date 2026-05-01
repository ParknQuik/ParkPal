# Session Start Instructions

**Last Updated:** April 20, 2026
**Documentation Structure:** 38 files (consolidated from 100+)

---

## When the user says "start"

### Step 1: Read Current State

**Read this file:**
- **`STATUS_REPORT.md`** — production readiness, deployment status, blockers, timeline

### Step 2: Read on-demand (only if relevant to what user wants to work on)

| Topic | File |
|-------|------|
| Mobile app issues / Kilo Code handoff | `CLAUDE_OPINION_REQUEST.md` |
| Roadmap / sprint planning | `ROADMAP.md` |
| Tech stack | `TECH_STACK_SUMMARY.md` |
| System architecture / data models | `docs/PARKPAL_SYSTEM_ARCHITECTURE.md` |
| Deployment / infrastructure | `docs/DEPLOYMENT.md` |
| Environment variables | `docs/ENVIRONMENTS.md` |
| Secret Manager setup | `docs/GCP_SECRET_MANAGER.md` |
| PayMongo payments | `docs/PAYMONGO.md` |
| Google Maps setup | `docs/GOOGLE_MAPS_SETUP.md` |
| Auto-checkout service | `backend/AUTO_CHECKOUT.md` |
| Mobile testing | `frontend/mobile/TESTING.md` |
| Analytics (Service 1, Phase 6+) | `docs/future-phases/SERVICE_1_ANALYTICS.md` |
| Phase history | `docs/phase-completions/HISTORY.md` |
| Full doc index | `DOCUMENTATION.md` |

---

## After Reading

Provide a concise summary (3-4 sentences) of current state, then ask: **"What would you like to work on?"**

---

## Current State (April 2026)

**Deployment:**
- Backend API: ✅ Cloud Run — https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app
- Web Frontend: ✅ Cloud Run — https://parkpal-web-dev-cxntrkjjmq-as.a.run.app
- Mobile App: ❌ Not in app stores (EAS ready)

**Production Readiness: 60-65%** (per latest honest audit in `CLAUDE_OPINION_REQUEST.md`)

**Active blockers (from re-audit April 18, 2026):**
1. `ListYourSpot.tsx:133` — undefined `isEditMode` crashes on render
2. Listing photo upload sends device file paths instead of GCS URLs — photos never upload
3. `mediaApi.ts:9` — hardcoded IP `192.168.100.176` breaks all media uploads
4. Payment methods backend returns 501 (not implemented)

**Tech Stack:**
- Backend: Node.js + Express + PostgreSQL + Prisma
- Mobile: React Native + Expo + Redux Toolkit
- Web: React + Vite + Material-UI
- Payments: PayMongo (GCash, Cards, GrabPay, Maya, Cash)
- Infrastructure: GCP Cloud Run, Cloud SQL, Secret Manager, Cloud Storage
- Analytics (future): Databricks on GCP

---

## Git Workflow Policy

Always inform the user before committing or pushing.

### Before `git commit`:
1. Show a summary of what will be committed
2. Ask: "Ready to commit these changes?"
3. Wait for approval

### Before `git push`:
1. Inform user of commits to be pushed
2. Ask: "Ready to push to remote?"
3. Wait for approval

### Exception — commit/push automatically only if user explicitly says:
- "commit and push this"
- "go ahead and commit"
- "auto-commit"

---

## Git Branch Protection

- `dev` and `main` are **PROTECTED** — direct pushes will be rejected
- Always use feature branches + pull requests

### Workflow:
```bash
git checkout -b feat/descriptive-name
git add [files]
git commit -m "descriptive message"
git push -u origin feat/descriptive-name
gh pr create --base dev --head feat/descriptive-name --title "Title" --body "Description"
```

Never attempt `git push origin dev` or `git push origin main` directly.

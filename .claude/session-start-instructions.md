# Session Start Instructions

**Last Updated:** May 22, 2026
**Documentation Structure:** 38 files (consolidated from 100+)

---

## When the user says "start"

### Step 1: Get Lean Repo Context First

Use the token-budgeted context wrapper before broad markdown scans:

```bash
npm run knowledge:context -- "current project status"
```

If the database is missing or stale, rebuild it:

```bash
npm run knowledge:rebuild-if-stale
```

Use the cited source line ranges as the default read boundary. Treat `needs-verification`, `planned`, and `historical` results as leads, not confirmed truth. Use `npm run knowledge:query -- "<topic>"` only when the task needs deeper investigation.

### Step 2: Verify Current State

Always verify current project status against live repo evidence:

```bash
git status --short --branch --untracked-files=all
git log -1 --oneline --decorate
```

Then read the relevant `STATUS_REPORT.md` sections cited by `knowledge:context`.

### Step 3: Read on-demand (only if relevant to what user wants to work on)

| Topic | File |
|-------|------|
| Lean repo context | `npm run knowledge:context -- "<intent>"` |
| Deeper repo knowledge search | `npm run knowledge:query -- "<topic>"` |
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

## Current State

Do not trust a copied status snapshot in this instruction file. Start with `knowledge:context`, then verify against live git state and only the cited `STATUS_REPORT.md` ranges unless the task requires more detail.

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

# Session Start Instructions

**Last Updated:** May 23, 2026
**Documentation Structure:** 38 files (consolidated from 100+)

This is the detailed on-demand reference. The automatic startup surface is the
compact `AGENTS.md` startup card; do not include this file in plain startup
unless the user asks for detailed session instructions or chooses a task that
needs them.

---

## When the user says "start"

Use this startup flow when the user begins a session with any of these compact forms:

- `start`
- `start: <intent>`
- `start` followed by an `Intent:` line
- `start` followed by a short task description

If an intent is provided, use that exact intent for the lean context query. If the user only says `start`, default the intent to `current project status`.

### Step 1: Get Lean Repo Context First

Before relying on the knowledge index, rebuild it if stale:

```bash
npm run knowledge:rebuild-if-stale
```

Then use the token-budgeted context wrapper before broad markdown scans:

```bash
npm run knowledge:context -- "<intent>" --limit 1
```

For example, `start: current project status and next development step` means:

```bash
npm run knowledge:context -- "current project status and next development step" --limit 1
```

Plain startup is an under-500-token routing pass only. Do not open cited source ranges during startup. Treat the knowledge index as a router, not a source of truth. Treat `needs-verification`, `planned`, `historical`, and stale results as leads, not confirmed truth. Use `npm run knowledge:context -- "<intent>" --limit 3`, `npm run knowledge:query -- "<topic>"`, or cited source ranges only after the user chooses a task or asks for verified status. Add `--verbose` only when debugging retrieval output.

### Step 2: Verify Git State

Always verify the printed Branch/HEAD against live repo evidence:

```bash
git status --short --branch --untracked-files=all
git log -1 --oneline --decorate
```

Stop after git verification and ask what the user wants to work on. Do not read `STATUS_REPORT.md` excerpts or other cited ranges during plain startup unless the user provided a specific intent that requires verified status.

### Step 3: Read on-demand (only if relevant to what user wants to work on)

| Topic | File |
|-------|------|
| Lean startup routing | `npm run knowledge:context -- "<intent>" --limit 1` |
| Planning / implementation context | `npm run knowledge:context -- "<intent>" --limit 3` |
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

## After Startup

Provide a concise routing summary with the intent, verified branch/HEAD, and the one top knowledge lead. Do not claim verified project status unless the user asked for status validation. Then ask: **"What would you like to work on?"**

---

## Current State

Do not trust a copied status snapshot in this instruction file. Start with `knowledge:context --limit 1`, then verify live git state. Read cited `STATUS_REPORT.md` ranges only after the user chooses a concrete task or asks for verified status.

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

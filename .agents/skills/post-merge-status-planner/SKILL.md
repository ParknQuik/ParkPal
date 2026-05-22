---
name: post-merge-status-planner
description: After a PR successfully merges to dev, update ParkPal STATUS_REPORT.md from live repo evidence and then plan the next development steps using the requested planning flow or planning agent.
---

# Post-Merge Status Planner

Use this skill when the user says a PR has merged to `dev`, asks to update `STATUS_REPORT.md` after a merge, or asks to plan next steps after a successful merge.

## Workflow

### 1. Query repo knowledge

Use the repo-local knowledge index before broad status/doc scans:

```bash
npm run knowledge:query -- "post merge status report dev current gaps blockers"
```

Use the cited files and line ranges as pointers. Treat `needs-verification`, `planned`, and `historical` chunks as leads, then verify with live repo state.

### 2. Verify the merge landed on `dev`

Use live repo state, not assumptions.

```bash
git fetch origin dev
git status --short --branch --untracked-files=all
git log -1 --oneline --decorate origin/dev
```

If the current branch is not `dev`, do not discard local work. If the working tree is clean, switch to `dev` and fast-forward:

```bash
git switch dev
git pull --ff-only origin dev
```

If the working tree is dirty, stop and explain what is blocking the branch switch.

### 3. Update `STATUS_REPORT.md`

Read the current report and reconcile it against live evidence.

Minimum evidence to collect:

```bash
git log -1 --oneline --decorate
git status --short --branch --untracked-files=all
git diff --stat
rg -n "Production Readiness|Test Status|Current Reconciliation|Current Gaps|Critical Blockers|Open Pull Requests|Next|TODO|Blockers" STATUS_REPORT.md
```

Update only sections that changed because of the merge. Prefer narrow reconciliation over broad rewrites.

Required update targets:

- Update History table: add a new row for the merge, with date, actor, summary, and readiness score.
- Current Reconciliation / Current State: reflect the merged PR and current branch.
- Test Status: update only with tests actually run in this session or CI results explicitly verified.
- Current Gaps / Critical Blockers: remove stale blockers only when live evidence supports it; otherwise mark as historical or needs verification.
- Next steps / recommendations: replace stale plans with current, actionable next steps.

Do not commit `.codex/hooks.json` or any auto-commit behavior.

### 4. Validate before commit

Run checks proportional to the merge contents. At minimum:

```bash
git diff --check
```

For web changes:

```bash
cd frontend/web && npm test -- --run
```

For mobile changes:

```bash
cd frontend/mobile && npm test -- --runInBand
```

For backend changes:

```bash
cd backend && npm test
```

If a check cannot run because of environment or sandbox limits, capture the exact error and state the residual risk.

### 5. Commit and push with approval

Follow the repo policy in `.claude/session-start-instructions.md`.

Before committing:

- Show the staged file list and summary.
- Ask: `Ready to commit these changes?`
- Wait for approval.

Before pushing:

- Show the commit(s) to push.
- Ask: `Ready to push to remote?`
- Wait for approval.

Suggested commit message:

```bash
docs: update status report after dev merge
```

### 6. Plan next steps

After `STATUS_REPORT.md` is updated and pushed, produce a decision-complete next-steps plan.

Planning requirements:

- Base the plan on the updated `STATUS_REPORT.md`, live git state, and verified test/deployment evidence.
- Separate product/application work from repo-local tooling drift.
- Include goal, success criteria, concrete work items, validation, and assumptions.
- If Plan Mode is active, output the official plan in a single `<proposed_plan>` block.
- If the user explicitly asked for a planning agent/subagent and tool policy allows it, use the requested planning agent/subagent for the planning pass; otherwise perform the planning locally and say that no separate planning agent was available.

Do not implement the next-step plan unless the user explicitly asks to proceed after the plan.

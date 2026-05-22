---
name: parkpal-knowledge
description: Query ParkPal repo-local knowledge before broad doc scans.
---

# ParkPal Knowledge Retrieval

Use this skill before broad project-context scans, status analysis, onboarding,
implementation planning, and cross-agent handoff.

## Workflow

1. Run `npm run knowledge:context -- "<user intent>"` for startup, current-status,
   continue, planning, and handoff prompts.
2. Verify the printed Branch/HEAD with `git status` before making current-state
   claims.
3. Open only the cited line ranges by default.
4. Use `npm run knowledge:query -- "<topic>"` only when the task needs deeper
   investigation beyond the lean context output.
5. Read any freshness warnings first. If HEAD or source files changed since the
   DB was built, treat the index as a router and rebuild before relying on rank.
6. Treat `needs-verification`, `planned`, `historical`, and `isStale` chunks as
   leads, not confirmed truth. Stale roadmap text should not outrank current
   status evidence for "continue" or "next steps" work.
7. For current project status, always verify with `git status`, latest commit,
   and cited `STATUS_REPORT.md` ranges.
8. Do not rely on the index for source-code truth when code files are directly
   relevant. Use it to find where to inspect.

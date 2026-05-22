---
name: parkpal-knowledge
description: Query ParkPal repo-local knowledge before broad doc scans.
---

# ParkPal Knowledge Retrieval

Use this skill before broad project-context scans, status analysis, onboarding,
implementation planning, and cross-agent handoff.

## Workflow

1. Run `npm run knowledge:query -- "<user intent>"`.
2. Open only the cited files and exact source references needed.
3. Read any freshness warnings first. If HEAD or source files changed since the
   DB was built, treat the index as a router and rebuild before relying on rank.
4. Treat `needs-verification`, `planned`, `historical`, and `isStale` chunks as
   leads, not confirmed truth. Stale roadmap text should not outrank current
   status evidence for "continue" or "next steps" work.
5. For current project status, always verify with `git status`, latest commit,
   and `STATUS_REPORT.md`.
6. Do not rely on the index for source-code truth when code files are directly
   relevant. Use it to find where to inspect.

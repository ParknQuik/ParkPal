---
name: parkpal-knowledge
description: Query ParkPal repo-local knowledge before broad doc scans.
---

# ParkPal Knowledge Retrieval

Use this skill before broad project-context scans, status analysis, onboarding,
implementation planning, and cross-agent handoff.

## Workflow

1. For plain startup, run `npm run knowledge:context -- "<user intent>" --limit 1`.
   Treat startup as an under-500-token routing pass only: rebuild if stale,
   verify git state, then stop and ask what to work on.
2. For planning, implementation, current-status follow-up, continue, and handoff
   prompts after the user chooses a task, run
   `npm run knowledge:context -- "<user intent>" --limit 3`.
   Compact output is the default; add `--verbose` only when debugging the
   retrieval layer itself.
3. Verify the printed Branch/HEAD with `git status` before making current-state
   claims.
4. During plain startup, do not open cited line ranges or `STATUS_REPORT.md`
   excerpts unless the user provided a specific intent that requires verified
   status. Open only cited line ranges by default after a task is selected.
5. Use `npm run knowledge:query -- "<topic>"` only when the task needs deeper
   investigation beyond the lean context output.
6. Read any freshness warnings first. If HEAD or source files changed since the
   DB was built, treat the index as a router and rebuild before relying on rank.
7. Treat `needs-verification`, `planned`, `historical`, and `isStale` chunks as
   leads, not confirmed truth. Stale roadmap text should not outrank current
   status evidence for "continue" or "next steps" work.
8. For current project status follow-up, always verify with `git status`, latest
   commit, and cited `STATUS_REPORT.md` ranges.
9. Do not rely on the index for source-code truth when code files are directly
   relevant. Use it to find where to inspect.

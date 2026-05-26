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
3. For implementation `<proposed_plan>` blocks, copy the compact model, effort,
   tier, confidence, and reason into a short `Model Routing` line. For
   substantial handoffs, include `Recommended model`, `Reasoning effort`,
   `Tier`, `Confidence`, and `Reason`; run
   `npm run knowledge:model-routing -- "<implementation intent>"` to print the
   block.
4. Treat routing as advisory only. It is for handoff, orchestration, or human
   operator selection; Codex cannot self-switch models from repo code, and this
   is not app-runtime OpenAI routing.
5. Verify the printed Branch/HEAD with `git status` before making current-state
   claims.
6. During plain startup, do not open cited line ranges or `STATUS_REPORT.md`
   excerpts unless the user provided a specific intent that requires verified
   status. Open only cited line ranges by default after a task is selected.
7. Use `npm run knowledge:query -- "<topic>"` only when the task needs deeper
   investigation beyond the lean context output.
8. Read any freshness warnings first. If HEAD or source files changed since the
   DB was built, treat the index as a router and rebuild before relying on rank.
9. Treat `needs-verification`, `planned`, `historical`, and `isStale` chunks as
   leads, not confirmed truth. Stale roadmap text should not outrank current
   status evidence for "continue" or "next steps" work.
10. For current project status follow-up, always verify with `git status`, latest
   commit, and cited `STATUS_REPORT.md` ranges.
11. Do not rely on the index for source-code truth when code files are directly
   relevant. Use it to find where to inspect.

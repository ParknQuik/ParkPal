# ParkPal Startup Card

Only this file is loaded automatically; detailed guidance is in
`.claude/session-start-instructions.md` (do not load it at plain startup).

When the user says `start` or gives a compact startup intent:

1. Rebuild only if stale: `rtk npm run knowledge:rebuild-if-stale`.
2. Run `rtk npm run knowledge:context -- "<intent>" --limit 1` (default intent:
   `current project status`).
3. Verify `rtk git status --short --branch --untracked-files=normal` and
   `rtk git log -1 --oneline --decorate`.
4. Stop and ask what to work on.

Startup is routing only: don't open `STATUS_REPORT.md`, broad docs, or cited
ranges unless verified status is requested or a task is chosen. Then use
`rtk npm run knowledge:context -- "<intent>" --limit 3` or cited ranges. Use
`rtk git status --short --branch --untracked-files=all` only when diagnostics
need every untracked path.

For plans and cross-agent handoffs, copy `knowledge:context` routing metadata
into `<proposed_plan>` as `Model Routing`. Substantial handoffs include:

- `Recommended model: <model>`
- `Reasoning effort: <effort>`
- `Tier: <tier>`
- `Confidence: <conf>`
- `Reason: <top router reason>`

Every implementation plan also includes `Required skills` and `Required agents`
inside `<proposed_plan>`: list applicable skills and when used; assign specialist
agents a scoped implementation/review role or write `None`. This documents the
handoff; it doesn't launch agents during planning. If a needed resource is
unavailable, state that and the best fallback. Keep `Model Routing` alongside.

Generate it with `rtk npm run knowledge:model-routing -- "<intent>"`. Routing is
advisory: Codex cannot self-switch from repo code; ParkPal has no app/server LLM
routing.

When explicitly asked to start a new Codex task from a completed plan, follow
`docs/agent-knowledge/CODEX_TASK_HANDOFF.md`. Presenting a plan alone does not
authorize creating a task.

Before committing or pushing, summarize the changes and ask for approval.

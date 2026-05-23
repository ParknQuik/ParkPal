# ParkPal Agent Archive

This archive keeps non-daily Codex skills available on demand without exposing
them in the automatic `.agents/skills` discovery surface.

Daily startup should only advertise the core ParkPal workflow skills:

- `parkpal-knowledge`
- `test-runner`
- `backend-diagnostics`
- `pr-checker`
- `post-merge-status-planner`

Archived skills can be restored by moving the relevant directory from
`.agents/archive/skills/` back into `.agents/skills/`.

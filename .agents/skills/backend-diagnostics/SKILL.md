---
name: backend-diagnostics
description: Run relevant repository-defined checks and report diagnostics for ParkPal backend files.
---

When the user asks to check or diagnose the backend:

1. Inspect `backend/package.json` and the current task to select an applicable lint, typecheck, build, or diagnostics command. If no such script exists, say so; do not imply that a check ran.
2. Use an available project diagnostics integration when it provides relevant current results. Otherwise run only the appropriate repository-defined check.
3. Report the source of each result and group actionable errors and warnings by file with line references. Separate checks that passed, failed, or were not run.

Do not claim the work is ready to commit or prescribe a commit as an automatic next step. A clean diagnostic run covers only the checks performed. Do not run unrelated tests or infrastructure checks unless the request calls for them.

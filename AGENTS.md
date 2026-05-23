# ParkPal Startup Card

Use this file as the only automatic repo startup instruction surface.
Detailed startup guidance remains available on demand in
`.claude/session-start-instructions.md`; do not auto-load that file for plain
startup.

When the user says `start` or gives a compact startup intent:

1. Rebuild the local knowledge index only if stale:
   `npm run knowledge:rebuild-if-stale`
2. Run lean context with one result:
   `npm run knowledge:context -- "<intent>" --limit 1`
   Use `current project status` when no intent is provided.
3. Verify live git state:
   `git status --short --branch --untracked-files=all`
   `git log -1 --oneline --decorate`
4. Stop and ask what to work on.

Plain startup is routing only. Do not open `STATUS_REPORT.md`, broad docs, or
cited source ranges unless the user asks for verified status or chooses a
specific task. After a task is selected, use
`npm run knowledge:context -- "<intent>" --limit 3` or targeted cited ranges as
needed.

Before committing or pushing, summarize the changes and ask for approval.

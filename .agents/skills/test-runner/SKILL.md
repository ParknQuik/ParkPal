---
name: test-runner
description: Run the test command that matches the user's requested ParkPal package or scope and report observed results.
---

When the user requests tests, identify the affected package and use its current `package.json` script. Examples in this repository include `cd backend && npm test`, `cd frontend/web && npm test -- --run`, and root-level scripts such as `npm run test:all`; inspect the relevant package scripts rather than assuming the request means the backend suite. Run only the requested or clearly relevant checks.

Report the command, package, observed pass/fail/skip counts when available, duration when reported, and actionable failure details with file and line references. Distinguish test failures from setup or infrastructure failures. Do not invent counts, expected results, or causes. If a check could not run, state why and mark it as not run.

Database-backed tests can depend on a local test database and environment configuration. Before any database mutation or destructive test setup, verify the intended test database target using the repository's current instructions. Do not switch to a hosted database or perform cost-bearing cloud recovery as a test workaround.

Testing results describe the checks that ran; they do not establish commit, merge, or deployment readiness. Follow the user's explicit scope and report unrun checks without expanding the task.

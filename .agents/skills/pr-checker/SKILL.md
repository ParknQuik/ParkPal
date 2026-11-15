---
name: pr-checker
description: Validate the requested ParkPal change or pull request using relevant repository checks and evidence.
---

When the user asks to check PR readiness, validate a PR, or asks whether a change can merge:

1. Establish the requested scope and inspect the current diff and package scripts.
2. Run only checks relevant to the changed packages and the requested review. Use `backend-diagnostics` and `test-runner` when their backend scopes apply; select web, mobile, contract, or other checks from the repository's current scripts when those areas changed.
3. Review Git state and PR metadata only when available and relevant. A local checkout cannot prove remote CI or current base-branch status; verify those through an authorized live source or report them unverified.
4. Check deployment or cloud health only when the user requests it or it is necessary to diagnose the reported issue. Cloud access may be unavailable; report that limitation and continue with independent checks.
5. Use a separate read-only reviewer only when the user or applicable workflow requests delegation and the reviewer is available. Otherwise review the relevant diff directly.

Report each check as passed, failed, or not run, with its command or evidence source and any important limitation. Prioritize concrete correctness, security, and reliability findings; include file and line references and practical impact. Do not use fixed sample counts or fabricated outcomes. Do not declare a change ready to merge based on checks that were not run or remote state that was not verified.

This skill reviews and reports. Do not create, merge, or publish a PR, commit changes, deploy services, or make cost-bearing infrastructure changes unless separately authorized under the active session instructions.

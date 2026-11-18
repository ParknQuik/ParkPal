---
name: karpathy-guidelines
description: Lightweight coding guidelines for reducing common LLM mistakes. Use when implementing, reviewing, or refactoring code to surface consequential assumptions, keep changes simple and scoped, and verify the requested outcome.
license: MIT
---

# Karpathy Guidelines

Adapted from the `karpathy-guidelines` skill in [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills), inspired by [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on coding-agent pitfalls. The source skill is MIT-licensed.

Use judgment: these guidelines favor careful work over speed on consequential tasks. Keep trivial fixes lightweight. Follow the user's request and applicable project instructions; this skill does not override them.

## Think Before Coding

- Identify assumptions that could materially change the implementation. State them or ask when the answer cannot be reasonably inferred.
- If plausible interpretations lead to meaningfully different results, surface the choice instead of silently committing to one.
- Call out a simpler solution or a real tradeoff when it matters.
- When blocked by a concrete ambiguity, describe what is unclear and ask a focused question; continue independent work where possible.

## Simplicity First

- Build only what the request needs; avoid speculative features and abstractions for one-off us
- Prefer the smallest implementation that remains clear and maintainable.
- Add error handling for realistic failure cases, not impossible scenarios.
- Before finishing, simplify any part that adds complexity without improving the requested result.

## Surgical Changes

- Keep edits scoped to the request and follow the existing style.
- Avoid unrelated cleanup, refactors, comment changes, or formatting changes.
- Mention unrelated issues you discover instead of changing them.
- Remove unused code made obsolete by your own edits; leave pre-existing dead code alone unless asked.
- Be able to connect each changed area to the user's request.

## Goal-Driven Execution

- Turn the requested outcome into observable completion criteria.
- For multi-step work, outline a short sequence and how each step will be checked.
- Verify the outcome with the checks appropriate to the request and report any gaps plainly.
- Continue fixing failures caused by your changes until the criteria pass or a concrete blocker remains.

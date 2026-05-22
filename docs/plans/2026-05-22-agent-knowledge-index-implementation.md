# Agent Knowledge Index Implementation Plan

**Date:** May 22, 2026
**Status:** Ready for implementation
**Scope:** Repo-local knowledge retrieval for ParkPal agents and developers

---

## Goal

Create a lightweight repo-local knowledge index so Codex, VS Code agents, and other developers can retrieve ParkPal project context quickly without scanning every markdown file on each session.

This is not a hosted vector database project. The first implementation should be a boring, inspectable, local system using structured metadata and SQLite full-text search.

Primary outcomes:

- Reduce repeated markdown scans during project orientation.
- Make current, planned, historical, deprecated, and needs-verification knowledge explicit.
- Let agents query relevant docs before opening source files.
- Keep markdown as the human source of truth.
- Give new developers fast answers with source file references.

---

## Recommendation

Implement **Phase 1: SQLite FTS + structured metadata + query CLI + agent skill**.

Defer embeddings, hosted vector DBs, and cloud retrieval services until keyword/topic search proves insufficient.

Expected practical token reduction for recurring project-context tasks: **60-85%**.

---

## Files To Add

```text
.agents/knowledge/
  README.md
  schema.md
  sources.json
  knowledge.db              # generated, gitignored if preferred

.agents/skills/parkpal-knowledge/
  SKILL.md

scripts/knowledge/
  build-index.js
  query.js
```

Optional after MVP:

```text
.agents/knowledge/chunks/*.json
.agents/knowledge/topics/*.json
scripts/knowledge/validate-index.js
```

---

## Package Scripts

Add these root scripts to `package.json`:

```json
{
  "knowledge:build": "node scripts/knowledge/build-index.js",
  "knowledge:query": "node scripts/knowledge/query.js",
  "knowledge:refresh": "npm run knowledge:build",
  "knowledge:validate": "node scripts/knowledge/query.js --self-test"
}
```

Keep implementation in plain Node.js unless a dependency is clearly justified.

If SQLite support requires a package, prefer `better-sqlite3` for simplicity. If avoiding new dependencies for MVP, generate JSON chunks first and add SQLite in the next pass.

---

## Source Set

Start with docs that repeatedly affect agent decisions:

```json
{
  "sources": [
    {
      "path": "STATUS_REPORT.md",
      "subsystem": "status",
      "priority": "always",
      "defaultStatus": "current"
    },
    {
      "path": "DOCUMENTATION.md",
      "subsystem": "docs",
      "priority": "always",
      "defaultStatus": "current"
    },
    {
      "path": "ROADMAP.md",
      "subsystem": "planning",
      "priority": "high",
      "defaultStatus": "planned"
    },
    {
      "path": "TECH_STACK_SUMMARY.md",
      "subsystem": "architecture",
      "priority": "high",
      "defaultStatus": "current"
    },
    {
      "path": "docs/BETA_READINESS_CHECKLIST.md",
      "subsystem": "status",
      "priority": "high",
      "defaultStatus": "needs-verification"
    },
    {
      "path": "docs/PARKPAL_SYSTEM_ARCHITECTURE.md",
      "subsystem": "architecture",
      "priority": "high",
      "defaultStatus": "current"
    },
    {
      "path": "frontend/mobile/TESTING.md",
      "subsystem": "mobile",
      "priority": "medium",
      "defaultStatus": "current"
    },
    {
      "path": "backend/AUTO_CHECKOUT.md",
      "subsystem": "backend",
      "priority": "medium",
      "defaultStatus": "current"
    },
    {
      "path": ".claude/session-start-instructions.md",
      "subsystem": "agent-workflow",
      "priority": "medium",
      "defaultStatus": "needs-verification"
    }
  ]
}
```

Do not index every markdown file in the first pass. Add sources deliberately as they prove useful.

---

## Data Model

Each indexed chunk should include:

```json
{
  "id": "STATUS_REPORT.md#current-state#001",
  "sourcePath": "STATUS_REPORT.md",
  "headingPath": ["Current State", "Mobile"],
  "subsystem": "mobile",
  "topics": ["theme", "headers", "dark-mode"],
  "knowledgeStatus": "current",
  "priority": "high",
  "summary": "Shared mobile header behavior is controlled through AppHeader and theme tokens.",
  "content": "Original markdown chunk text.",
  "references": [
    "frontend/mobile/src/components/AppHeader.tsx",
    "frontend/mobile/src/context/ThemeContext.tsx"
  ],
  "startLine": 120,
  "endLine": 148,
  "lastIndexedCommit": "git-short-sha",
  "lastIndexedAt": "2026-05-22T00:00:00Z"
}
```

Use these `knowledgeStatus` values only:

- `current`
- `planned`
- `historical`
- `deprecated`
- `needs-verification`

The status matters because ParkPal has had docs where older deployment or readiness language looked current after project direction changed.

---

## Build Index Behavior

`scripts/knowledge/build-index.js` should:

1. Read `.agents/knowledge/sources.json`.
2. Parse markdown into heading-based chunks.
3. Preserve line numbers for every chunk.
4. Infer topic tags using simple deterministic rules.
5. Store chunks in SQLite FTS or JSON, depending on MVP dependency decision.
6. Save the current git short SHA on each chunk.
7. Print a concise summary:

```text
Indexed 9 sources, 84 chunks.
Current: 42, planned: 17, historical: 8, deprecated: 2, needs-verification: 15.
Database: .agents/knowledge/knowledge.db
```

Do not use an LLM inside the build step. The index must be deterministic and cheap to regenerate.

---

## Query Behavior

`scripts/knowledge/query.js` should support:

```bash
npm run knowledge:query -- "mobile dark mode header"
npm run knowledge:query -- "current beta blockers"
npm run knowledge:query -- "backend auth seeded users"
npm run knowledge:query -- "deployment status"
```

Output should be short and source-grounded:

```text
Query: mobile dark mode header

1. frontend/mobile/TESTING.md > Theme Validation
   status: current | subsystem: mobile | score: 9.1
   summary: Mobile theme validation should cover AppHeader behavior in light and dark mode.
   source: frontend/mobile/TESTING.md:42-68

2. STATUS_REPORT.md > Recent Mobile Fixes
   status: current | subsystem: mobile | score: 8.4
   summary: Header safe-area normalization recently landed for shared mobile screens.
   source: STATUS_REPORT.md:120-146

Suggested next reads:
- frontend/mobile/src/components/AppHeader.tsx
- frontend/mobile/src/context/ThemeContext.tsx
```

Default to top 5 results. Add flags:

```bash
--limit 10
--status current
--subsystem mobile
--json
--self-test
```

---

## Agent Skill

Add `.agents/skills/parkpal-knowledge/SKILL.md` with instructions like:

```markdown
---
name: parkpal-knowledge
description: Query ParkPal repo-local knowledge before broad doc scans.
---

# ParkPal Knowledge Retrieval

Use this skill before broad project-context scans, status analysis, onboarding, implementation planning, and cross-agent handoff.

Workflow:

1. Run `npm run knowledge:query -- "<user intent>"`.
2. Open only the cited files and exact source references needed.
3. Treat `needs-verification`, `planned`, and `historical` chunks as leads, not confirmed truth.
4. For current project status, always verify with `git status`, latest commit, and `STATUS_REPORT.md`.
5. Do not rely on the index for source-code truth when code files are directly relevant. Use it to find where to inspect.
```

---

## Gitignore Decision

Recommended:

- Commit `.agents/knowledge/sources.json`.
- Commit `.agents/knowledge/schema.md`.
- Commit `.agents/knowledge/README.md`.
- Do not commit `knowledge.db` unless the team wants reproducible retrieval without a build step.

If not committing the database, add:

```gitignore
.agents/knowledge/knowledge.db
.agents/knowledge/knowledge.db-*
```

The generated DB should be rebuildable with `npm run knowledge:build`.

---

## MVP Acceptance Criteria

The first implementation is complete when:

- `npm run knowledge:build` creates the local index successfully.
- `npm run knowledge:query -- "current project status"` returns `STATUS_REPORT.md` and `DOCUMENTATION.md` references.
- `npm run knowledge:query -- "mobile header dark mode"` returns mobile/theme/header related references.
- `npm run knowledge:query -- "deployment status"` marks deployment-related content as `needs-verification` unless it is clearly current.
- Query output includes file paths and line numbers.
- The agent skill tells future agents to query before broad markdown scans.
- The implementation does not require Docker, cloud services, or long-running servers.

---

## Non-Goals

Do not build these in Phase 1:

- Hosted vector database.
- Cloud embedding pipeline.
- Agent memory synchronization service.
- Automatic rewriting of markdown docs.
- Full source-code semantic indexing.
- PR bot or GitHub Actions workflow.
- UI dashboard.

These may be useful later, but they are unnecessary for proving the retrieval loop.

---

## Phase 2 Options

Only consider these after Phase 1 is useful:

1. Add git and PR knowledge:
   - merged PR summaries
   - important branch decisions
   - recurring validation commands
   - known environment blockers

2. Add source-code ownership maps:
   - controllers/services/screens/components
   - test commands per subsystem
   - known high-risk files

3. Add local embeddings:
   - use a local embedding model or SQLite vector extension
   - keep embeddings optional
   - continue returning exact source references

4. Add freshness validation:
   - warn when `lastIndexedCommit` differs from `HEAD`
   - warn when source files changed after the DB was built

---

## Implementation Notes

Use deterministic topic inference first. Examples:

```js
const topicRules = [
  [/header|safe area|statusbar|theme|dark mode/i, ["mobile", "theme", "headers"]],
  [/payment|paymongo|gcash|maya|card/i, ["payments"]],
  [/cloud run|gcp|deployment|secret manager/i, ["infrastructure", "deployment"]],
  [/auth|login|seed|password/i, ["auth"]],
  [/booking|reservation|checkout|penalty/i, ["booking"]],
  [/test|jest|coverage|validation/i, ["testing"]]
];
```

Keep rules simple and editable. Bad deterministic tags are easier to fix than opaque generated summaries.

For line numbers, parse the markdown file line by line and start a new chunk on headings (`#`, `##`, `###`). Include the heading text in each chunk so FTS can rank it.

---

## Suggested Implementation Order

1. Add `.agents/knowledge/sources.json`.
2. Add `.agents/knowledge/schema.md`.
3. Add `scripts/knowledge/build-index.js` with JSON output first.
4. Add `scripts/knowledge/query.js` against JSON.
5. Add SQLite FTS if JSON search feels too weak or slow.
6. Add package scripts.
7. Add `.agents/skills/parkpal-knowledge/SKILL.md`.
8. Run the acceptance queries.
9. Update this plan with actual command output if implementation differs.

Starting with JSON first is acceptable if the VS Code session wants the smallest possible MVP. The architectural target remains SQLite FTS.

---

## Implementation Result

Implemented on branch `feat/agent-knowledge-index` with SQLite FTS as the Phase 1 backend.

Key implementation choices:

- Used Node 22 `node:sqlite` and SQLite FTS5, so no npm dependency was added.
- Kept `.agents/knowledge/knowledge.db` generated and gitignored.
- Opened query reads with SQLite `immutable=1` so read-only commands do not need lock-file writes.
- Added deterministic topic inference, summary extraction, source reference extraction, source diversification, and `needs-verification` result surfacing.
- Added `knowledge:build`, `knowledge:query`, `knowledge:refresh`, and `knowledge:validate` package scripts.

Validation output:

```text
$ npm run knowledge:build
Indexed 9 sources, 293 chunks.
Current: 203, planned: 67, historical: 0, deprecated: 0, needs-verification: 23.
Database: .agents/knowledge/knowledge.db

$ npm run knowledge:validate
Knowledge index self-test passed.
```

Acceptance queries verified:

- `npm run knowledge:query -- "current project status"`
- `npm run knowledge:query -- "mobile header dark mode"`
- `npm run knowledge:query -- "deployment status"`
- `npm run knowledge:query -- "backend auth seeded users"`
- `npm run knowledge:query -- "current project status" --json`
- `npm run knowledge:query -- "mobile header dark mode" --status current --limit 3`

# ParkPal Knowledge System Handover for Codex

**Date:** May 23, 2026
**Archive note:** Historical handover from the knowledge-index rollout. This is
not an automatic startup file; use the root `AGENTS.md` startup card for current
Codex startup routing.

---

## 1. Summary of What Was Accomplished

### Core Knowledge System Implementation
- **Repo-local knowledge index** created with SQLite database for fast retrieval
- **Compact JSONL mirrors** for agent-facing high-traffic context (status, roadmap, workflow)
- **Freshness detection** tracks HEAD changes and source file modifications
- **Deterministic topic inference** from chunk content
- **Status labeling system**: `current`, `planned`, `historical`, `deprecated`, `needs-verification`

### Key Deliverables (PR #144 merged)
- `scripts/knowledge/build-index.js` - Main indexer parsing markdown, compact JSONL, and source-map.json
- `scripts/knowledge/build-compact-mirrors.js` - Generates compact mirrors from canonical docs
- `scripts/knowledge/query.js` - FTS5-backed query with ranking and freshness warnings
- `scripts/knowledge/context.js` - Lean context for startup (limit 1) and task follow-up (limit 3)
- `.agents/knowledge/compact/status.jsonl` - 11 status records
- `.agents/knowledge/compact/roadmap.jsonl` - 5 roadmap records
- `.agents/knowledge/compact/workflow.jsonl` - 4 workflow records
- `.agents/knowledge/sources.json` - 12 configured knowledge sources
- `.agents/knowledge/source-map.json` - 5 curated routing entries for payments, mobile UI, booking

### Token Savings Benchmark
- `scripts/knowledge/measure-savings.js` - Compares compact context vs full-file baselines
- Startup context (limit 1): 147 tokens vs 15,554 for minimal baseline (99% savings)
- Follow-up context (limit 3): 716 tokens vs 18,239 for common baseline (96% savings)
- Token budgets verified: startup under 500 tokens, follow-up under 800 tokens

---

## 2. Current State of the Knowledge System

### Database Location
- Generated at OS temp dir: `/var/folders/.../parkpal-knowledge/<hash>/knowledge.db`
- Repo-scoped by hash to avoid conflicts between checkouts

### Available CLI Commands
```bash
rtk npm run knowledge:build              # Build compact mirrors + index
rtk npm run knowledge:compact            # Build compact JSONL mirrors only
rtk npm run knowledge:check              # Exit 0 if DB fresh, non-zero if stale
rtk npm run knowledge:rebuild-if-stale   # Rebuild if HEAD/source changed
rtk npm run knowledge:context -- "intent" --limit 1   # Startup (under 500 tokens)
rtk npm run knowledge:context -- "intent" --limit 3   # Task follow-up
rtk npm run knowledge:query -- "topic"                # Deep investigation
rtk npm run knowledge:query -- "topic" --json         # JSON output
rtk npm run knowledge:validate                         # Self-test
rtk npm run knowledge:measure-savings                  # Benchmark comparison
```

### Knowledge Sources (12 total)
| Path | Type | Subsystem | Status |
|------|------|-----------|--------|
| `.agents/knowledge/compact/status.jsonl` | compact-jsonl | status | current |
| `.agents/knowledge/compact/roadmap.jsonl` | compact-jsonl | planning | planned |
| `.agents/knowledge/compact/workflow.jsonl` | compact-jsonl | agent-workflow | current |
| `STATUS_REPORT.md` | markdown | status | current |
| `DOCUMENTATION.md` | markdown | docs | current |
| `ROADMAP.md` | markdown | planning | planned |
| `TECH_STACK_SUMMARY.md` | markdown | architecture | current |
| `docs/BETA_READINESS_CHECKLIST.md` | markdown | status | needs-verification |
| `docs/PARKPAL_SYSTEM_ARCHITECTURE.md` | markdown | architecture | current |
| `frontend/mobile/TESTING.md` | markdown | mobile | current |
| `backend/AUTO_CHECKOUT.md` | markdown | backend | current |
| `.claude/session-start-instructions.md` | markdown | agent-workflow | needs-verification |
| `.agents/knowledge/source-map.json` | source-map | agent-workflow | current |

### Validation Coverage
- Fresh/stale index detection
- Status ranking (current > planned > historical)
- Compact record canonical source range validation
- 500/800 token budget enforcement for startup/follow-up
- Source map/query routing for payments, QR, mobile theme

---

## 3. Remaining Tasks/Issues

### High Priority
1. **Knowledge rebuild timing** - The DB uses OS temp dir which can be cleaned aggressively. Consider making rebuild a more frequent part of workflows.

2. **Source map expansion** - Currently has 5 entries (payments, QR scanner, UI icons, booking, mobile theme). The system is designed for more granular source ownership maps.

3. **Documentation sync** - `sources.json` schema.md and README.md have been updated but `package.json` scripts and AGENTS.md need verification for new commands.

### Medium Priority
4. **Override system** - `.agents/knowledge/compact/overrides/` directory exists but no override files created yet. Could be used for session-specific knowledge.

5. **Date detection refinement** - Currently detects ISO dates and month-name dates. Consider adding more patterns for roadmap dates.

6. **Topic rule expansion** - Current rules cover major subsystems but could be extended for more specific routing.

### Future Optimization
7. **Incremental indexing** - Currently rebuilds all sources. Could support partial updates for large repos.

8. **Multi-language support** - Current parser is markdown-specific. Consider JSON/TSX reference extraction improvements.

---

## 4. Next Steps for Further Optimization

### Immediate (Next Session)
1. Run `rtk npm run knowledge:validate` to verify all tests pass
2. Run `rtk npm run knowledge:measure-savings` to confirm token budgets
3. Verify `rtk npm run knowledge:rebuild-if-stale` behavior after HEAD changes

### Short-term Additions
1. **Add source-map entries** for:
   - Backend auth/authentication flow
   - Web dashboard components
   - Cloud Run deployment configuration

2. **Expand compact records** for:
   - Payment validation evidence
   - Mobile TypeScript patterns
   - Git workflow guidelines

3. **Add override files** for:
   - Session-running temporary notes
   - Task-specific context additions

### Known Verification Items
- Backend Cloud Run health needs re-verification (503 degraded on May 17)
- PR #142 status needs verification with `gh pr list`
- Beta readiness checklist evidence needs validation

---

## Key Files to Modify

| File | Purpose |
|------|---------|
| `.agents/knowledge/sources.json` | Add/remove/configure knowledge sources |
| `.agents/knowledge/source-map.json` | Add source ownership/routing entries |
| `.agents/knowledge/compact/status.jsonl` | Status mirror (auto-generated, can add overrides) |
| `.agents/knowledge/compact/roadmap.jsonl` | Roadmap mirror (auto-generated, can add overrides) |
| `.agents/knowledge/compact/workflow.jsonl` | Workflow mirror (auto-generated, can add overrides) |
| `scripts/knowledge/build-compact-mirrors.js` | Modify compact record generation logic |
| `scripts/knowledge/build-index.js` | Core indexing logic |
| `scripts/knowledge/query.js` | Query/ranking logic |
| `scripts/knowledge/context.js` | Context formatting |

---

## Coding Conventions

- SQLite uses `DatabaseSync` from Node.js built-in `node:sqlite`
- All scripts in `scripts/knowledge/` follow same patterns
- Compact JSONL uses short keys: `id`, `h`, `sys`, `st`, `pri`, `d`, `txt`, `refs`, `src`, `tags`
- Canonical citations must have valid `src.path`, `src.start`, `src.end` within source file
- Freshness warnings printed when HEAD or indexed sources changed

---

## Quick Start for Codex

```bash
# Verify current state
rtk git status --short --branch
rtk npm run knowledge:rebuild-if-stale
rtk npm run knowledge:context -- "current project status" --limit 1

# Run validation
rtk npm run knowledge:validate
rtk npm run knowledge:measure-savings
```

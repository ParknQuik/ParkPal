# Future Skills Roadmap - Workflow Acceleration

**Last Updated:** March 10, 2026
**Purpose:** Plan and prioritize skills to accelerate ParkPal development

---

## 🎯 Skills Classification

### ✅ Completed (5 skills)
1. **backend-diagnostics** - Code error detection
2. **deployment-status** - Infrastructure health check
3. **gcp-cost-monitor** - Cost tracking & optimization
4. **brainstorming** - Structured ideation
5. **gcp-cloud-run** - Cloud Run guidance

---

## 🚀 High Priority (Immediate Impact)

### 1. **test-runner** 🧪
**Priority:** P0 - CRITICAL
**Estimated Time:** 2 hours
**Impact:** Run tests 5x faster, immediate feedback

**Trigger:** "run tests", "test backend", "check tests"

**What it does:**
- Runs `npm test` in backend directory
- Parses test output (Jest format)
- Reports pass/fail with details
- Highlights failing tests
- Suggests fixes for common failures

**MCP Used:** `Bash` tool for test execution

**Example Output:**
```
🧪 Backend Test Results

✅ Passed: 235/271 tests (86.7%)
❌ Failed: 34 tests
⏱️ Duration: 12.3 seconds

Failed Tests:
• analytics.test.js (12 failures)
  - Missing `password` field in fixtures
  - Fix: Add password to test user objects

• media.test.js (10 failures)
  - Same issue

Ready to commit: NO (fix 34 failures first)
```

**Why we need it:**
- Currently takes 2-3 minutes to run tests manually
- Need instant feedback before commits
- Essential for CI/CD confidence

---

### 2. **pr-checker** 🔍
**Priority:** P0 - CRITICAL
**Estimated Time:** 3 hours
**Impact:** Prevent broken PRs, 90% fewer CI failures

**Trigger:** "check pr", "pr ready?", "validate pr"

**What it does:**
- Runs `backend-diagnostics` (check code errors)
- Runs `test-runner` (verify tests pass)
- Checks branch is up to date with base
- Validates commit message format
- Ensures no merge conflicts
- Generates PR checklist

**MCP Used:**
- `mcp__ide__getDiagnostics` (code errors)
- `Bash` (git operations, test execution)

**Example Output:**
```
🔍 Pull Request Validation

Branch: feature/photo-upload → dev

✅ Code Quality
   - No TypeScript/JavaScript errors
   - All files formatted correctly

✅ Tests
   - 271/271 tests passing
   - No new test failures

✅ Git Status
   - Branch up to date with dev
   - No merge conflicts
   - 5 commits with conventional format

⚠️ Warnings
   - Large changeset: 147 files changed
   - Consider splitting into smaller PRs

🎯 Ready to Create PR: YES
```

**Why we need it:**
- Prevents failed PR checks
- Saves time on back-and-forth
- Ensures quality before review

---

### 3. **secret-manager** 🔐
**Priority:** P1 - HIGH
**Estimated Time:** 2 hours
**Impact:** Safe secret operations, prevent leaks

**Trigger:** "manage secrets", "add secret", "update secret", "list secrets"

**What it does:**
- Lists all secrets in GCP Secret Manager
- Creates new secrets safely (prompts for value)
- Updates existing secret versions
- Grants IAM access to service accounts
- Never logs secret values
- Validates secret format before saving

**MCP Used:** `mcp__gcloud__run_gcloud_command`

**Example Output:**
```
🔐 Secret Manager Operations

Current Secrets (11):
✅ DATABASE_URL (latest: v5, updated Mar 10)
✅ JWT_SECRET (latest: v2, updated Feb 22)
✅ SMTP_HOST (latest: v3, updated Feb 23)
... (8 more)

What would you like to do?
1. Add new secret
2. Update existing secret
3. Grant service account access
4. Rotate secret

[Waits for user choice, then executes safely]
```

**Why we need it:**
- Manual secret management is error-prone
- Need to prevent accidental secret exposure
- Simplifies secret rotation

---

### 4. **git-helper** 📝
**Priority:** P1 - HIGH
**Estimated Time:** 3 hours
**Impact:** 50% faster git operations

**Trigger:** "commit this", "create branch", "merge to main"

**What it does:**
- Smart commit message generation
- Conventional commits format enforcement
- Branch naming suggestions
- Safe merge operations
- Automatic conflict detection
- Git best practices guidance

**MCP Used:** `Bash` for git operations

**Example Output:**
```
📝 Git Helper - Smart Commit

Files changed (5):
• backend/services/email.js (modified)
• backend/tests/email.test.js (new)
• .claude/skills/backend-diagnostics/SKILL.md (new)
• STATUS_REPORT.md (modified)
• .claude/MCP_INTEGRATION_GUIDE.md (new)

Suggested commit message:
"feat: Add MCP integration and backend diagnostics skill"

Conventional commit type: feat ✅
Breaking changes: No
Scope: backend, docs

Run pre-commit checks? [Y/n]
```

**Why we need it:**
- Ensures commit message consistency
- Prevents accidental commits
- Follows conventional commits standard

---

## 📋 Medium Priority (Next 2 Weeks)

### 5. **frontend-deploy** 🌐
**Priority:** P2 - MEDIUM
**Estimated Time:** 4 hours
**Impact:** Automate frontend deployments

**Trigger:** "deploy web", "deploy mobile", "frontend deploy"

**What it does:**
- Builds web app (Vite)
- Deploys to Firebase Hosting or Vercel
- Builds mobile app (EAS Build)
- Manages environment variables
- Health check after deployment

**MCP Used:**
- `mcp__gcloud__run_gcloud_command` (Firebase)
- `Bash` (build commands)

**Why we need it:**
- Web/mobile still not deployed (critical gap)
- Need automated frontend CI/CD
- Essential for beta launch

---

### 6. **db-manager** 🗄️
**Priority:** P2 - MEDIUM
**Estimated Time:** 3 hours
**Impact:** Safe database operations

**Trigger:** "db status", "run migration", "backup database"

**What it does:**
- Shows Cloud SQL status (running/stopped)
- Runs Prisma migrations safely
- Creates database backups
- Restores from backups
- Shows database size/usage
- Manages connection strings

**MCP Used:** `mcp__gcloud__run_gcloud_command`

**Example Output:**
```
🗄️ Database Manager

Instance: parkpal-db (PostgreSQL 16)
Status: RUNNABLE ✅
Region: asia-southeast1
Tier: db-g1-small
Cost: $87/month (when running)

Database: parknquik_staging
Size: 2.3 GB
Tables: 11
Last migration: 2026-03-02 15:26 UTC

Actions:
1. Run pending migrations (0 pending)
2. Create backup
3. Stop instance (save $87/month)
4. View connection string
```

**Why we need it:**
- Database operations are risky
- Need safe migration workflow
- Cost optimization (start/stop)

---

### 7. **log-analyzer** 📊
**Priority:** P2 - MEDIUM
**Estimated Time:** 3 hours
**Impact:** Faster bug investigation

**Trigger:** "check logs", "find errors", "analyze logs"

**What it does:**
- Fetches Cloud Run logs
- Parses log levels (error/warning/info)
- Groups by error type
- Identifies patterns
- Suggests fixes for known errors
- Filters by time range

**MCP Used:** `mcp__gcloud__run_gcloud_command`

**Example Output:**
```
📊 Log Analysis (Last 100 entries)

Errors (3):
❌ "Cannot connect to database" × 2 (8:45 AM, 9:12 AM)
   → Database was stopped, started at 9:15 AM

❌ "Secret Manager access denied" × 1 (9:30 AM)
   → IAM permission issue, check service account

Warnings (5):
⚠️ "Redis connection timeout" × 5
   → Redis not configured (expected)

Info (92):
✅ Normal operation, no issues

Recommendation: Fix database auto-start on deployment
```

**Why we need it:**
- Logs are hard to parse manually
- Need quick error identification
- Essential for production debugging

---

### 8. **performance-checker** ⚡
**Priority:** P2 - MEDIUM
**Estimated Time:** 4 hours
**Impact:** Catch performance regressions

**Trigger:** "check performance", "load test", "benchmark"

**What it does:**
- Runs Artillery load tests
- Measures API response times
- Checks database query performance
- Identifies bottlenecks
- Compares against benchmarks
- Suggests optimizations

**MCP Used:** `Bash` (Artillery execution)

**Example Output:**
```
⚡ Performance Check

Load Test: 100 users over 60 seconds

API Endpoints:
✅ GET /api/parking-slots (p95: 45ms) - EXCELLENT
✅ POST /api/auth/login (p95: 120ms) - GOOD
⚠️ GET /api/bookings (p95: 580ms) - SLOW
   → Database query needs optimization

Database:
• 42 queries executed
• 3 slow queries (>500ms)
• Suggestions: Add index on bookings.user_id

Overall: GOOD (with 1 optimization needed)
```

**Why we need it:**
- Performance testing is manual
- Need to catch regressions early
- Essential before scaling

---

## 🔮 Future Phase (Phase 6+)

### 9. **analytics-runner** 📈
**Priority:** P3 - FUTURE (Phase 6)
**Estimated Time:** 5 hours
**Impact:** Service 1 analytics automation

**Trigger:** "run analytics", "calculate circling time", "occupancy report"

**What it does:**
- Executes Python analytics scripts
- Queries PostgreSQL for parking sessions
- Calculates circling time metrics
- Generates occupancy reports
- Visualizes data with charts
- Exports to CSV/JSON

**MCP Used:** `mcp__ide__executeCode` (Python execution)

**Why we need it:**
- Service 1 analytics is future priority
- Need Python execution for data science
- Databricks integration testing

---

### 10. **ml-model-tester** 🤖
**Priority:** P3 - FUTURE (Phase 7)
**Estimated Time:** 6 hours
**Impact:** ML model validation

**Trigger:** "test ml model", "validate predictions"

**What it does:**
- Loads ML models (MLflow)
- Runs test predictions
- Validates model accuracy
- Checks for data drift
- Compares model versions
- Generates performance reports

**MCP Used:** `mcp__ide__executeCode`

**Why we need it:**
- Phase 7 includes ML models
- Need model quality assurance
- Essential for predictive features

---

### 11. **data-pipeline** 🔄
**Priority:** P3 - FUTURE (Phase 6)
**Estimated Time:** 8 hours
**Impact:** Databricks pipeline automation

**Trigger:** "run pipeline", "etl status", "data sync"

**What it does:**
- Triggers Databricks jobs
- Monitors pipeline status
- Shows data lineage
- Validates data quality
- Manages Delta Lake tables
- Schedules pipeline runs

**MCP Used:** `mcp__gcloud__run_gcloud_command` (Databricks API)

**Why we need it:**
- Service 1 uses Databricks
- Need pipeline orchestration
- Essential for analytics platform

---

## 📊 Implementation Priority Matrix

| Skill | Priority | Effort | Impact | Dependencies |
|-------|----------|--------|--------|--------------|
| **test-runner** | P0 | 2h | HIGH | None |
| **pr-checker** | P0 | 3h | HIGH | test-runner, backend-diagnostics |
| **secret-manager** | P1 | 2h | MEDIUM | None |
| **git-helper** | P1 | 3h | MEDIUM | None |
| **frontend-deploy** | P2 | 4h | HIGH | None |
| **db-manager** | P2 | 3h | MEDIUM | None |
| **log-analyzer** | P2 | 3h | MEDIUM | None |
| **performance-checker** | P2 | 4h | MEDIUM | None |
| **analytics-runner** | P3 | 5h | FUTURE | Phase 6 |
| **ml-model-tester** | P3 | 6h | FUTURE | Phase 7 |
| **data-pipeline** | P3 | 8h | FUTURE | Phase 6 |

---

## 🎯 Recommended Next Steps

### This Week (Mar 10-16)
1. ✅ Create `test-runner` skill (2 hours)
2. ✅ Create `pr-checker` skill (3 hours)
3. ✅ Test both skills with real workflows

**Estimated Time:** 5 hours
**Impact:** 90% fewer PR failures, 5x faster test feedback

### Next Week (Mar 17-23)
4. Create `secret-manager` skill (2 hours)
5. Create `git-helper` skill (3 hours)
6. Start `frontend-deploy` skill (4 hours)

**Estimated Time:** 9 hours
**Impact:** Safe secret ops, consistent commits, frontend deployment

### Week After (Mar 24-30)
7. Complete `frontend-deploy` skill
8. Create `db-manager` skill (3 hours)
9. Create `log-analyzer` skill (3 hours)

**Estimated Time:** 6 hours (+ frontend-deploy completion)
**Impact:** Full deployment automation, better debugging

---

## 💡 Skill Development Best Practices

### 1. Start with User Story
```
As a developer, I want to [action]
So that I can [benefit]
```

### 2. Define Trigger Phrases
```
Primary: "run tests"
Secondary: "test backend", "check tests", "npm test"
```

### 3. Specify MCP Tools
```
- mcp__ide__getDiagnostics (code errors)
- mcp__gcloud__run_gcloud_command (GCP ops)
- Bash (general commands)
```

### 4. Design Output Format
```
Clear headers (🎯, ✅, ❌, ⚠️)
Actionable summaries
Specific file:line references
Next steps / recommendations
```

### 5. Test Thoroughly
```
1. Happy path (everything works)
2. Error cases (failures)
3. Edge cases (unusual inputs)
4. Performance (speed check)
```

---

## 📈 Success Metrics

**Current State:**
- 5 skills operational
- 3 MCP-powered skills
- 30-50% faster GCP operations
- Instant code diagnostics

**Target State (2 weeks):**
- 11 skills operational (6 new)
- 90% fewer PR failures
- 5x faster test feedback
- Full deployment automation
- Safe secret management

**Long-term Target (Phase 6):**
- 14+ skills operational
- Complete workflow automation
- Analytics pipeline automation
- ML model testing integrated

---

## 🤝 Contributing New Skills

Want to add a new skill?

1. **Identify the workflow** you want to automate
2. **Check existing skills** to avoid duplication
3. **Create skill file**: `.claude/skills/{skill-name}/SKILL.md`
4. **Test the skill** with real workflows
5. **Document in this roadmap**
6. **Update SKILLS_QUICK_REFERENCE.md**

---

**Roadmap Status:** ✅ Active planning
**Next Review:** March 17, 2026 (after test-runner + pr-checker implementation)

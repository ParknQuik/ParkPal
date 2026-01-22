# Claude Code Configuration

**ParkPal Project** - everything-claude-code structure

This file points to the comprehensive Claude Code configuration structure.

---

## 📂 Project Structure

```
.claude/
├── agents/              # Specialized subagents for delegation
│   ├── planner.md                    # Feature implementation planning
│   ├── architect.md                  # System design decisions
│   ├── tdd-guide.md                  # Test-driven development
│   ├── code-reviewer.md              # Quality and security review
│   ├── security-reviewer.md          # Vulnerability analysis
│   ├── refactor-cleaner.md           # Dead code cleanup
│   ├── frontend-developer.md         # Frontend specialist
│   ├── mobile-developer.md           # Mobile specialist
│   ├── data-engineer.md              # Data pipeline specialist
│   ├── test-automator.md             # Test automation
│   ├── ui-ux-designer.md             # UI/UX specialist
│   └── documentation-expert.md       # Documentation specialist
│
├── skills/              # Workflow definitions and domain knowledge
│   ├── coding-standards.md           # Language best practices
│   ├── backend-patterns.md           # API, database, caching patterns
│   └── frontend-patterns.md          # React, Next.js patterns
│
├── commands/            # Slash commands for quick execution
│   ├── plan.md                       # /plan - Implementation planning
│   ├── tdd.md                        # /tdd - Test-driven development
│   ├── code-review.md                # /code-review - Quality review
│   └── test-coverage.md              # /test-coverage - Coverage analysis
│
├── rules/               # Always-follow guidelines
│   ├── security.md                   # Mandatory security checks
│   ├── testing.md                    # TDD, 80% coverage requirement
│   └── git-workflow.md               # Commit format, PR process
│
├── hooks/               # Trigger-based automations
│   └── hooks.json                    # PreToolUse, PostToolUse, Stop hooks
│
└── session-start-instructions-NEW.md # Session initialization
```

---

## 🚀 Quick Start

### For New Sessions

When starting a new session, say **"start"** to initialize:

1. **Reads:**
   - `JANUARY_2026_STATUS_REPORT.md` - Current project state (87% production ready)
   - `docs/MVP_ROADMAP_Q1_2026.md` - Phase 5 roadmap (40% complete)
   - `TECH_STACK_SUMMARY.md` - Technology stack

2. **Provides:**
   - Concise project summary
   - Current blockers and timeline
   - Next milestone

### For Feature Development

```bash
# 1. Plan the feature
/plan photo-upload

# 2. Write tests first
/tdd photo-upload-service --type=unit

# 3. Implement feature
# ... code ...

# 4. Review code
/code-review photo-upload-service

# 5. Check coverage
/test-coverage
```

---

## 🤖 Specialized Agents

### When to Use Agents

| Agent | Use When | Example |
|-------|----------|---------|
| **planner** | Starting new feature | "Plan the analytics dashboard" |
| **architect** | System design needed | "Design the data pipeline architecture" |
| **tdd-guide** | Writing tests | "Write tests for user registration" |
| **code-reviewer** | Before committing | "Review the payment service code" |
| **security-reviewer** | Security-sensitive changes | "Review auth endpoints for vulnerabilities" |
| **frontend-developer** | React/Next.js work | "Build responsive booking card component" |
| **mobile-developer** | React Native work | "Implement QR scanner screen" |
| **data-engineer** | Data pipeline work | "Build Databricks ETL pipeline" |
| **test-automator** | Test automation | "Create E2E test suite for booking flow" |

### How to Delegate

```
"Delegate to planner: Plan the forgot password feature implementation"
"Use architect agent to design the caching strategy"
"Ask security-reviewer to audit the API endpoints"
```

---

## 📋 Rules (Always Follow)

### 1. Security Rules

**MANDATORY - Enforced by GitHub Actions**

- ❌ No hardcoded secrets
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (Prisma)
- ✅ Rate limiting on auth endpoints
- ✅ HTTPS only in production

See [.claude/rules/security.md](.claude/rules/security.md)

### 2. Testing Rules

**MANDATORY - 80% Coverage Required**

- ✅ Write tests before implementation (TDD)
- ✅ Coverage: 80% statements, 75% branches, 80% functions, 80% lines
- ✅ Test naming: `should [behavior] when [condition]`
- ✅ Test isolation (no shared state)

See [.claude/rules/testing.md](.claude/rules/testing.md)

### 3. Git Workflow Rules

**MANDATORY - Enforced by GitHub Actions**

**Commit Format:**
```
<type>(<scope>): <description>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Branch Naming:**
```
<type>/<description-in-kebab-case>
```

**Branch Flow:**
```
feature/* → dev → qa → main
hotfix/*  → qa → main (bypass dev)
```

See [.claude/rules/git-workflow.md](.claude/rules/git-workflow.md)

---

## 🎯 Current Project Status

**Phase 5: Public Launch (40% Complete)**

### ✅ Completed
- Forgot password flow (backend + 17 tests)
- CI/CD fixes (mobile tests 100% passing)
- Web test coverage dependency fixes
- Performance testing health checks

### 🔴 P1 Blockers (Must Fix Before Beta)
1. **Photo Upload** - GCP Cloud Storage integration (2-3 days) ⏳ IN PROGRESS
2. **Mobile Forgot Password UI** - Frontend screens (0.5 days)
3. **Backend Test Database Setup** - 30 min one-time setup

### 📅 Timeline
- **Week 3 (Jan 20-24)**: Staging deployment
- **Week 4 (Jan 27-31)**: Beta testing (50 users)
- **Week 5-6 (Feb 3-14)**: Production launch 🚀

---

## 📚 Key Documentation

### Essential (Read Every Session)
1. `JANUARY_2026_STATUS_REPORT.md` - Current state
2. `docs/MVP_ROADMAP_Q1_2026.md` - Roadmap
3. `TECH_STACK_SUMMARY.md` - Tech stack

### Reference (Read On-Demand)
4. `docs/PARKPAL_SYSTEM_ARCHITECTURE.md` - Architecture
5. `docs/API.md` - API documentation
6. `CODE_GUIDELINES.md` - Code standards

---

## 🛠️ Tech Stack

**Backend:** Node.js + Express + PostgreSQL + Prisma + Redis
**Mobile:** React Native + Expo + Redux Toolkit
**Web:** React + Next.js + Material-UI
**Analytics:** Databricks on GCP + Cloud Storage
**Payments:** PayMongo (GCash, Cards, GrabPay, Maya)

---

## 🔗 Related Files

- **Session Start**: [.claude/session-start-instructions-NEW.md](.claude/session-start-instructions-NEW.md)
- **Code Guidelines**: [CODE_GUIDELINES.md](CODE_GUIDELINES.md)
- **Status Report**: [JANUARY_2026_STATUS_REPORT.md](JANUARY_2026_STATUS_REPORT.md)
- **Roadmap**: [docs/MVP_ROADMAP_Q1_2026.md](docs/MVP_ROADMAP_Q1_2026.md)

---

**Last Updated:** January 22, 2026
**Status:** ✅ everything-claude-code structure implemented

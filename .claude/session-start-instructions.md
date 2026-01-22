# Session Start Instructions

**Last Updated:** January 22, 2026
**Structure:** everything-claude-code format

---

## When the user says "start"

Follow this **streamlined context gathering** workflow:

### Step 1: Read Essential Documentation (5 minutes)

Read these 3 files in order:

1. **`JANUARY_2026_STATUS_REPORT.md`**
   - Current status: 87% production ready
   - Phase 5 progress: 40% complete
   - P1 blockers and timeline

2. **`docs/MVP_ROADMAP_Q1_2026.md`**
   - Complete roadmap
   - Phases 1-4: Complete
   - Phase 5: In progress
   - Timeline to launch

3. **`TECH_STACK_SUMMARY.md`**
   - Authoritative tech stack
   - Architecture decisions
   - Technology choices

### Step 2: Provide Concise Summary (1 minute)

Format (3-4 sentences):
```
ParkPal is [X]% production ready with Phase 5 ([Y]% complete) in progress.
[Brief summary of recent work]. [X] P1 blockers remain: [list blockers].
Service 2 (Marketplace) launching [date], Service 1 (Analytics) [date].
```

### Step 3: Ask What to Work On

```
What would you like to work on?
```

---

## 📂 everything-claude-code Structure

The project now follows the comprehensive everything-claude-code structure:

```
.claude/
├── agents/              # 12 specialized subagents
│   ├── planner.md                    # Feature planning
│   ├── architect.md                  # System design
│   ├── tdd-guide.md                  # Test-driven development
│   ├── code-reviewer.md              # Code quality review
│   ├── security-reviewer.md          # Security analysis
│   ├── refactor-cleaner.md           # Code cleanup
│   ├── frontend-developer.md         # Frontend specialist
│   ├── mobile-developer.md           # Mobile specialist
│   ├── data-engineer.md              # Data pipeline
│   ├── test-automator.md             # Test automation
│   ├── ui-ux-designer.md             # UI/UX design
│   └── documentation-expert.md       # Documentation
│
├── skills/              # Workflow definitions
│   ├── coding-standards.md           # Best practices
│   └── backend-patterns.md           # API patterns
│
├── commands/            # Slash commands
│   ├── plan.md                       # /plan
│   └── tdd.md                        # /tdd
│
└── rules/               # Mandatory guidelines
    ├── security.md                   # Security rules
    ├── testing.md                    # Testing rules
    └── git-workflow.md               # Git rules
```

**See `CLAUDE.md` for complete documentation.**

---

## 🤖 Using Specialized Agents

### Common Scenarios

**Planning a feature:**
```
"Delegate to planner: Plan the photo upload feature"
```

**System design:**
```
"Use architect agent to design the analytics pipeline"
```

**Writing tests:**
```
"/tdd user-registration --type=unit"
```

**Code review:**
```
"Delegate to code-reviewer: Review the booking service"
```

**Security audit:**
```
"Delegate to security-reviewer: Audit auth endpoints"
```

### Agent Selection Guide

| Task | Agent | Example |
|------|-------|---------|
| Plan feature | planner | "Plan forgot password flow" |
| Design system | architect | "Design caching strategy" |
| Write tests | tdd-guide | "Generate tests for API endpoint" |
| Review code | code-reviewer | "Review payment service" |
| Security check | security-reviewer | "Audit for vulnerabilities" |
| Refactor | refactor-cleaner | "Clean up booking service" |
| Frontend work | frontend-developer | "Build responsive UI component" |
| Mobile work | mobile-developer | "Implement QR scanner" |
| Data pipeline | data-engineer | "Build ETL pipeline" |
| Test automation | test-automator | "Create E2E test suite" |

---

## 📋 Mandatory Rules (Always Follow)

### 1. Security Rules

**ENFORCED by GitHub Actions**

- ❌ No hardcoded secrets
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (Prisma)
- ✅ Rate limiting on sensitive endpoints
- ✅ HTTPS enforced in production

See `.claude/rules/security.md` for complete checklist.

### 2. Testing Rules

**ENFORCED - 80% Coverage Required**

- ✅ TDD: Write tests before implementation
- ✅ Coverage: 80% statements, 75% branches, 80% functions, 80% lines
- ✅ Test naming: `should [behavior] when [condition]`
- ✅ Test isolation (no shared state)

See `.claude/rules/testing.md` for complete guide.

### 3. Git Workflow Rules

**ENFORCED by GitHub Actions**

**Commit Format (Conventional Commits):**
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

See `.claude/rules/git-workflow.md` for complete workflow.

---

## 🎯 Current Project Status (January 22, 2026)

### Production Readiness: 87%

**Phase 5: Public Launch (40% Complete)**

### ✅ Recent Completions
- Forgot password flow (backend + 17 tests)
- CI/CD fixes (mobile tests 100% passing)
- Web test coverage dependency fixes
- Performance testing health checks
- everything-claude-code structure implementation

### 🔴 P1 Blockers (Must Fix Before Beta)
1. **Photo Upload** - GCP Cloud Storage integration (2-3 days) ⏳ IN PROGRESS
2. **Mobile Forgot Password UI** - Frontend screens (0.5 days)
3. **Backend Test Database Setup** - 30 min one-time setup

### 📅 Timeline to Launch
- **Week 3 (Jan 20-24)**: Staging deployment
- **Week 4 (Jan 27-31)**: Beta testing (50 users)
- **Week 5-6 (Feb 3-14)**: Production launch 🚀
- **Week 7-8 (Feb 17-28)**: Post-launch optimization

### Tech Stack
- **Backend:** Node.js + Express + PostgreSQL + Prisma + Redis
- **Mobile:** React Native + Expo + Redux Toolkit
- **Web:** React + Next.js + Material-UI
- **Analytics:** Databricks on GCP + Cloud Storage
- **Payments:** PayMongo (GCash, Cards, GrabPay, Maya)

---

## 📚 Key Documentation

### Essential Files (Read Every Session)
1. `JANUARY_2026_STATUS_REPORT.md` - Current state
2. `docs/MVP_ROADMAP_Q1_2026.md` - Complete roadmap
3. `TECH_STACK_SUMMARY.md` - Tech stack reference

### Reference Files (Read On-Demand)
4. `CLAUDE.md` - everything-claude-code structure guide
5. `CODE_GUIDELINES.md` - Complete code standards
6. `docs/PARKPAL_SYSTEM_ARCHITECTURE.md` - System architecture
7. `docs/API.md` - API documentation

### Agent Files (Use When Delegating)
8. `.claude/agents/planner.md` - Feature planning
9. `.claude/agents/architect.md` - System design
10. `.claude/agents/tdd-guide.md` - Test-driven development
11. `.claude/agents/code-reviewer.md` - Code review
12. `.claude/agents/security-reviewer.md` - Security audit

### Rules Files (Always Follow)
13. `.claude/rules/security.md` - Security checklist
14. `.claude/rules/testing.md` - Testing requirements
15. `.claude/rules/git-workflow.md` - Git workflow

---

## ⚠️ What NOT to Do

❌ **Don't** read all 100+ markdown files
❌ **Don't** read archived files in `docs/archive/`
❌ **Don't** read outdated roadmaps
❌ **Don't** spend 30+ minutes on documentation

✅ **Do** read the 3 essential files (15-20 min)
✅ **Do** use specialized agents for specific tasks
✅ **Do** follow mandatory rules
✅ **Do** provide concise summaries

---

## 🔄 Git Commit Policy

**IMPORTANT:** Always inform the user before committing or pushing changes.

### Before `git commit`:
1. Show summary of changes
2. Verify commit message follows Conventional Commits format
3. Ask: "Ready to commit these changes?"
4. Wait for user approval

### Before `git push`:
1. Inform user about commits to be pushed
2. Ask: "Ready to push to remote?"
3. Wait for user approval

### Exception:
Only commit/push automatically if user explicitly says:
- "commit and push this"
- "go ahead and commit"
- "auto-commit"

---

## 📖 Quick Reference Commands

```bash
# Start session
"start"

# Plan feature
"/plan photo-upload"

# Write tests
"/tdd user-registration --type=unit"

# Delegate to agent
"Delegate to planner: Plan the analytics dashboard"
"Use architect agent to design the data pipeline"
"Ask security-reviewer to audit the API endpoints"

# Review code
"Delegate to code-reviewer: Review auth service"

# Check project structure
"Show me the everything-claude-code structure"
```

---

## 🔗 Related Files

- **Main Config**: `CLAUDE.md`
- **Code Guidelines**: `CODE_GUIDELINES.md`
- **Status Report**: `JANUARY_2026_STATUS_REPORT.md`
- **Roadmap**: `docs/MVP_ROADMAP_Q1_2026.md`
- **Tech Stack**: `TECH_STACK_SUMMARY.md`

---

**Status:** ✅ everything-claude-code structure fully implemented
**Last Review:** January 22, 2026
**Next Review:** After Phase 5 launch (Feb 2026)

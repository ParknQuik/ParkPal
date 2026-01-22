# Documentation Standards & Update Process

**Last Updated:** January 4, 2026
**Purpose:** Standardize documentation updates and ensure consistency

---

## Documentation Structure

### **Essential Files (Always Up-to-Date)**

| File | Purpose | Update Frequency | Owner |
|------|---------|------------------|-------|
| **`JANUARY_2026_STATUS_REPORT.md`** | Current state snapshot | Monthly | Product Manager |
| **`MASTER_ROADMAP_2026.md`** | Complete 12-month roadmap | After each phase | Product Manager |
| **`TECH_STACK_SUMMARY.md`** | Authoritative tech stack | When tech changes | Tech Lead |
| **`SERVICE_1_ANALYTICS_GUIDE.md`** | Service 1 complete guide | When analytics changes | Analytics Lead |
| **`README.md`** | Project overview | When major changes | Engineering Lead |

### **Reference Files (Update as Needed)**

| File | Purpose | Update When | Owner |
|------|---------|-------------|-------|
| **`docs/PARKPAL_SYSTEM_ARCHITECTURE.md`** | System architecture | Architecture changes | Tech Lead |
| **`docs/API_DOCUMENTATION.md`** | API reference | New endpoints added | Backend Lead |
| **`docs/DEPLOYMENT.md`** | Deployment guide | Infra changes | DevOps Lead |
| **`TESTING_GUIDE.md`** | Testing & automation | New test types added | QA Lead |

### **Setup Files (Rarely Change)**

| File | Purpose | Update When | Owner |
|------|---------|-------------|-------|
| **`SETUP.md`** | Local dev setup | Setup process changes | Engineering Lead |
| **`docs/ENVIRONMENTS.md`** | Environment config | New env vars added | DevOps Lead |

---

## Update Triggers

### **When to Update Documentation**

#### After Completing a Phase
- [ ] Update `MASTER_ROADMAP_2026.md` (mark phase as complete)
- [ ] Create new status report (e.g., `FEBRUARY_2026_STATUS_REPORT.md`)
- [ ] Archive previous status report to `docs/archive/`
- [ ] Update `.claude/session-start-instructions.md` with latest status

#### After Merging a Feature Branch
- [ ] Check if feature impacts any essential docs
- [ ] Update `TECH_STACK_SUMMARY.md` if new tech added
- [ ] Update `docs/API_DOCUMENTATION.md` if new endpoints
- [ ] Update `MASTER_ROADMAP_2026.md` if roadmap changes

#### After Infrastructure Changes
- [ ] Update `docs/DEPLOYMENT.md` with new steps
- [ ] Update `docs/ENVIRONMENTS.md` with new env vars
- [ ] Update `TECH_STACK_SUMMARY.md` if stack changes

#### After Adding Tests
- [ ] Update `TESTING_GUIDE.md` with new test types
- [ ] Update test counts in status report

#### Monthly Review (1st of each month)
- [ ] Create new monthly status report
- [ ] Archive previous month's report
- [ ] Update roadmap progress percentages
- [ ] Review P1/P2/P3 blockers

---

## Pull Request Documentation Checklist

### **PR Template** (see `.github/PULL_REQUEST_TEMPLATE.md`)

Every PR must include this checklist:

```markdown
## Documentation Checklist

Check all that apply:

- [ ] **No documentation changes needed** (code-only change)
- [ ] Updated `MASTER_ROADMAP_2026.md` (if roadmap impacted)
- [ ] Updated `TECH_STACK_SUMMARY.md` (if new tech added)
- [ ] Updated `docs/API_DOCUMENTATION.md` (if new endpoints)
- [ ] Updated `TESTING_GUIDE.md` (if new test types)
- [ ] Updated `docs/DEPLOYMENT.md` (if infra changed)
- [ ] Updated phase completion in status report
- [ ] Created phase completion summary (if phase complete)

### Documentation Impact

**Which docs need updating?**
- [ ] None
- [ ] Roadmap
- [ ] Tech stack
- [ ] API docs
- [ ] Deployment
- [ ] Testing
- [ ] Other: _____________

**Why?**
[Brief explanation of what changed and why docs need updating]
```

---

## Automated Reminders

### **GitHub Actions Workflow** (see `.github/workflows/docs-reminder.yml`)

**Triggers:**
- On PR creation
- On PR merge to `main` or `dev`
- Monthly on the 1st at 9am

**Actions:**
1. Check if any code files changed
2. Comment on PR with documentation reminder
3. Assign documentation owner based on files changed

**Example PR Comment:**
```
🤖 Documentation Reminder

This PR modified files that may require documentation updates:

📝 **Recommended Updates:**
- `backend/routes/*.js` changed → Update `docs/API_DOCUMENTATION.md`
- `backend/prisma/schema.prisma` changed → Update `docs/PARKPAL_SYSTEM_ARCHITECTURE.md`

👤 **Assigned:** @backend-lead

Please check the documentation checklist in the PR template.
```

---

## Documentation Ownership

### **File Owners (CODEOWNERS)**

Create `.github/CODEOWNERS` to auto-assign reviewers:

```
# Documentation ownership
/docs/                                    @tech-lead @product-manager
/*.md                                     @product-manager
MASTER_ROADMAP_2026.md                    @product-manager
TECH_STACK_SUMMARY.md                     @tech-lead
SERVICE_1_ANALYTICS_GUIDE.md              @analytics-lead
docs/API_DOCUMENTATION.md                 @backend-lead
docs/DEPLOYMENT.md                        @devops-lead
TESTING_GUIDE.md                          @qa-lead
```

---

## Documentation Standards

### **File Naming**

✅ **Good:**
- `MASTER_ROADMAP_2026.md`
- `JANUARY_2026_STATUS_REPORT.md`
- `SERVICE_1_ANALYTICS_GUIDE.md`

❌ **Bad:**
- `roadmap.md` (too vague)
- `status.md` (no date)
- `analytics_stuff.md` (unclear)

### **File Headers**

All documentation files must include:

```markdown
# [Title]

**Last Updated:** [Date]
**Status:** [Planning | In Progress | Complete | Archived]
**Owner:** [Team/Person]
**Purpose:** [One sentence description]

---

[Content]
```

### **Update Markers**

When updating a file, add a comment at the top:

```markdown
<!-- UPDATED: 2026-01-15 - Added Phase 6 timeline -->
```

### **Archiving Old Files**

When a file becomes outdated:

1. Move to `docs/archive/[YEAR]/[MONTH]/`
2. Add archived date to filename: `PHASE_5_ROADMAP_ARCHIVED_2026_02.md`
3. Update any references in other docs

---

## Monthly Documentation Workflow

### **First of Each Month (e.g., Feb 1, 2026)**

1. **Create New Status Report**
   ```bash
   cp JANUARY_2026_STATUS_REPORT.md FEBRUARY_2026_STATUS_REPORT.md
   # Update dates, progress, blockers
   ```

2. **Archive Previous Report**
   ```bash
   mkdir -p docs/archive/2026/01/
   mv JANUARY_2026_STATUS_REPORT.md docs/archive/2026/01/
   ```

3. **Update Session Start Instructions**
   ```markdown
   # .claude/session-start-instructions.md
   # Update reference to new status report
   - JANUARY_2026_STATUS_REPORT.md → FEBRUARY_2026_STATUS_REPORT.md
   ```

4. **Update Roadmap Progress**
   - Update phase completion percentages
   - Mark completed tasks
   - Add new tasks for next phase

5. **Review and Clean**
   - Check for outdated documentation
   - Archive completed phase summaries
   - Update tech stack if needed

---

## Automated Monthly Report Generation

### **GitHub Actions - Monthly Report** (`.github/workflows/monthly-docs-update.yml`)

**Trigger:** 1st of each month at 9:00 AM

**Actions:**
1. Create new monthly status report template
2. Create PR with updates
3. Assign to Product Manager
4. Notify team in Slack/Discord

**Template:**
```markdown
# [MONTH] 2026 Status Report

**Report Date:** [DATE]
**Current Branch:** [AUTO-FILLED]
**Production Readiness:** [MANUAL UPDATE NEEDED]

## 🎯 Executive Summary

[MANUAL UPDATE NEEDED]

## What Changed This Month

- [AUTO-GENERATED from git log]

## Current Blockers

[MANUAL UPDATE NEEDED]

## Next Month Goals

[MANUAL UPDATE NEEDED]
```

---

## Phase Completion Documentation

### **When a Phase is Complete**

1. **Create Phase Completion Summary**
   ```markdown
   # PHASE_[N]_COMPLETION_SUMMARY.md

   **Phase:** [N]
   **Duration:** [Weeks]
   **Completion Date:** [Date]
   **Status:** ✅ Complete

   ## Deliverables
   - [x] Item 1
   - [x] Item 2

   ## Metrics
   - Tests: [Count]
   - Features: [Count]

   ## Learnings
   - [Key learnings]
   ```

2. **Update Master Roadmap**
   - Mark phase as 100% complete
   - Add completion date
   - Update next phase status to "in_progress"

3. **Archive to `docs/archive/phases/`**
   ```bash
   mkdir -p docs/archive/phases/
   mv PHASE_[N]_COMPLETION_SUMMARY.md docs/archive/phases/
   ```

4. **Update Session Start Instructions**
   - Update phase completion status
   - Update P1 blockers
   - Update current branch

---

## Documentation Quality Checklist

Before merging any documentation update:

- [ ] File has clear header with date and owner
- [ ] No outdated information (check dates)
- [ ] Links to other docs are valid
- [ ] Code examples are tested
- [ ] Formatting is consistent
- [ ] No spelling/grammar errors
- [ ] Matches documentation standards

---

## Tools & Automation

### **1. Pre-commit Hook** (`.git/hooks/pre-commit`)

```bash
#!/bin/bash
# Check if markdown files were modified

MD_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.md$')

if [ -n "$MD_FILES" ]; then
  echo "📝 Markdown files modified. Remember to:"
  echo "  - Update 'Last Updated' date"
  echo "  - Check for broken links"
  echo "  - Verify code examples"
  echo ""
fi
```

### **2. Markdown Linter** (`.markdownlint.json`)

```json
{
  "default": true,
  "MD013": false,
  "MD033": false,
  "MD041": false
}
```

Run with:
```bash
npm install -g markdownlint-cli
markdownlint '**/*.md' --ignore node_modules
```

### **3. Link Checker** (CI)

```yaml
# .github/workflows/check-links.yml
name: Check Documentation Links

on:
  pull_request:
    paths:
      - '**.md'

jobs:
  check-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: gaurav-nelson/github-action-markdown-link-check@v1
        with:
          use-quiet-mode: 'yes'
```

---

## Example: PR Documentation Update Workflow

### **Scenario:** Developer adds new API endpoint

**1. Developer creates PR:**
```
feat: Add forgot password endpoint

- Added POST /api/v1/auth/forgot-password
- Added POST /api/v1/auth/reset-password
- Integrated SendGrid for email sending
```

**2. GitHub Actions comments:**
```
🤖 Documentation Reminder

Files changed:
- backend/routes/auth.js → Update docs/API_DOCUMENTATION.md
- backend/package.json → Update TECH_STACK_SUMMARY.md (SendGrid added)

Assigned: @backend-lead
```

**3. Developer updates docs in same PR:**
```markdown
## Documentation Updates

- ✅ Updated docs/API_DOCUMENTATION.md with new endpoints
- ✅ Updated TECH_STACK_SUMMARY.md (added SendGrid)
- ✅ Updated MASTER_ROADMAP_2026.md (marked "Forgot Password" as complete)
```

**4. PR gets merged → Docs stay in sync! ✅**

---

## Enforcement

### **PR Merge Requirements**

Cannot merge PR until:
- [ ] Documentation checklist is completed
- [ ] Link checker passes
- [ ] Markdown linter passes
- [ ] Documentation owner approves

### **Monthly Audit**

Product Manager reviews:
- [ ] All essential files updated this month
- [ ] Previous month archived
- [ ] Roadmap progress accurate
- [ ] No broken links

---

## Quick Reference: Update Decision Tree

```
Did code change?
├─ Yes → Check what changed
│  ├─ New API endpoint? → Update API_DOCUMENTATION.md
│  ├─ New tech added? → Update TECH_STACK_SUMMARY.md
│  ├─ New deployment step? → Update DEPLOYMENT.md
│  ├─ New test type? → Update TESTING_GUIDE.md
│  ├─ Phase complete? → Update MASTER_ROADMAP.md + create completion summary
│  └─ Infrastructure change? → Update docs/DEPLOYMENT.md + ENVIRONMENTS.md
│
└─ No → No documentation update needed
```

---

## Summary

**Standardization:**
- ✅ Clear file ownership
- ✅ Update frequency defined
- ✅ Naming conventions
- ✅ File header standards
- ✅ Archiving process

**Automation:**
- ✅ PR template with checklist
- ✅ GitHub Actions reminders
- ✅ CODEOWNERS auto-assignment
- ✅ Monthly report generation
- ✅ Link checking
- ✅ Markdown linting

**Process:**
- ✅ Monthly review workflow
- ✅ Phase completion documentation
- ✅ Update decision tree

**Result:** Documentation stays up-to-date with minimal manual effort!

---

**Status:** ✅ Standards defined, ready to implement automation

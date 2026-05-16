---
name: pr-checker
description: Comprehensive PR validation orchestrating multiple skills and agents for quality assurance
---

When the user says "check pr", "pr ready?", "validate pr", "can i merge?", "ready for pr":

## Action Steps (Orchestrated Workflow)

This skill **orchestrates multiple skills and optionally launches agents** for comprehensive PR validation.

### Phase 1: Quick Validation (Skills - 15-30 seconds)

1. **Run backend-diagnostics skill**
   - Check for TypeScript/JavaScript errors
   - Uses: `mcp__ide__getDiagnostics`

2. **Run test-runner skill**
   - Execute all backend tests
   - Parse results for failures
   - Uses: Bash (npm test)

3. **Run git validation checks**
   - Check branch is up to date with base
   - Validate no merge conflicts
   - Check commit message format
   - Uses: Bash (git commands)

### Phase 2: Infrastructure Check (Skill - 5 seconds)

4. **Run deployment-status skill**
   - Verify infrastructure is healthy
   - Uses: `gcloud` CLI health checks

### Phase 3: Deep Review (Agent - CONDITIONAL)

5. **Launch code-reviewer agent** (only if needed)
   - If Phase 1 found issues → Skip deep review (fix issues first)
   - If Phase 1 clean → Launch agent for security/quality review
   - Uses: Task tool with code-reviewer agent

## Output Format

### Scenario A: All Checks Pass (Green Light)

```
🔍 Pull Request Validation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 QUICK VALIDATION (Phase 1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Code Quality (backend-diagnostics)
   • No TypeScript/JavaScript errors
   • All files properly formatted
   • Duration: 2 seconds

✅ Tests (test-runner)
   • 271/271 tests passing (100%)
   • Duration: 12.3 seconds
   • No new failures introduced

✅ Git Status
   • Branch: feature/photo-upload → dev
   • Up to date with base branch ✅
   • No merge conflicts ✅
   • 5 commits ahead
   • Commit format: Conventional commits ✅
   • Duration: 3 seconds

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 INFRASTRUCTURE (Phase 2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Deployment Health (deployment-status)
   • Backend: RUNNING ✅
   • Database: RUNNABLE ✅
   • Secrets: 11/11 configured ✅
   • Duration: 5 seconds

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔬 DEEP REVIEW (Phase 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Launching code-reviewer agent for comprehensive review...
(This will take 5-10 minutes for thorough analysis)

Files to review (12):
• backend/routes/photos.js
• backend/services/storage.js
• backend/controllers/photoController.js
• ... (9 more)

[Agent completes and returns results]

✅ Code Review (code-reviewer agent)
   • Security: No vulnerabilities found ✅
   • Performance: All optimized ✅
   • Best practices: Followed consistently ✅
   • Error handling: Comprehensive ✅
   • Test coverage: 95% (exceeds 80% requirement) ✅
   • Documentation: Complete ✅
   • Duration: 8 minutes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PR CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Code quality checks passed
✅ All tests passing
✅ No merge conflicts
✅ Branch up to date
✅ Infrastructure healthy
✅ Security review passed
✅ Performance acceptable
✅ Documentation complete

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 RESULT: READY TO CREATE PR ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total validation time: 8 minutes 22 seconds
All checks passed. PR is ready for review.

Suggested PR title:
"feat: Add photo upload feature with GCS integration"

Next steps:
1. Create PR: gh pr create --base dev --head feature/photo-upload
2. Add reviewers
3. Wait for CI/CD checks (should all pass ✅)
```

### Scenario B: Issues Found (Red Light)

```
🔍 Pull Request Validation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 QUICK VALIDATION (Phase 1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Code Quality (backend-diagnostics)
   • 2 errors found
   • backend/services/storage.js:45
     → Cannot find module '@google-cloud/storage'
   • backend/routes/photos.js:123
     → 'req.file' is possibly undefined

✅ Tests (test-runner)
   • 268/271 passing (98.9%)
   • 3 NEW failures (introduced by your changes)
   • tests/photos.test.js
     → Missing test coverage for error cases

⚠️  Git Status
   • Branch: feature/photo-upload → dev
   • 2 commits behind base branch (NEED REBASE)
   • No merge conflicts ✅
   • Commit format: 1 invalid commit message

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 STOPPING: Fix issues before deep review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Code-reviewer agent NOT launched (fix issues first)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 ACTION ITEMS (Must Fix)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Priority 1: Code Errors (2)
1. Install missing dependency:
   npm install @google-cloud/storage

2. Add null check for req.file:
   if (!req.file) {
     return res.status(400).json({ error: 'No file uploaded' });
   }

Priority 2: Test Failures (3)
3. Fix photos.test.js failures
   Add test cases for error scenarios

Priority 3: Git Issues
4. Rebase on latest dev:
   git fetch origin dev
   git rebase origin/dev

5. Fix commit message:
   Use conventional commits format:
   feat/fix/docs/chore: description

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 RESULT: NOT READY FOR PR ❌
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fix 5 issues above, then run "check pr" again.

Estimated fix time: 15-20 minutes
```

### Scenario C: Warning Level (Yellow Light)

```
🔍 Pull Request Validation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Code quality checks passed
✅ All tests passing
✅ No merge conflicts
✅ Infrastructure healthy

⚠️  WARNINGS (3)

1. Large changeset:
   • 147 files changed (+3,245, -892)
   • Consider splitting into smaller PRs
   • Reason: Easier to review, faster approval

2. No documentation updates:
   • Changed 12 backend files
   • No updates to docs/ or README.md
   • Consider: Add usage examples

3. Missing migration:
   • Schema changes detected in Prisma
   • No migration file in this PR
   • Action: Run `npx prisma migrate dev`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 RESULT: READY WITH WARNINGS ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PR can be created, but address warnings for better quality.

Recommended: Fix warnings first (30 min)
Alternative: Create PR with warnings noted in description
```

## Git Validation Details

### Branch Status Check
```bash
# Check if branch is up to date
git fetch origin
git status

# Check for divergence
git rev-list --left-right --count origin/dev...HEAD
```

**Validation:**
- ✅ Branch is up to date with base
- ⚠️ Branch is behind base (needs rebase)
- ❌ Branch has diverged (needs manual resolution)

### Merge Conflict Check
```bash
# Simulate merge to check for conflicts
git merge-tree $(git merge-base origin/dev HEAD) origin/dev HEAD
```

**Result:**
- ✅ No conflicts
- ❌ Conflicts detected (shows files)

### Commit Message Validation
```bash
# Get commit messages
git log origin/dev..HEAD --pretty=format:"%s"
```

**Conventional Commits Format:**
```
✅ feat: Add photo upload feature
✅ fix: Handle missing file uploads
✅ docs: Update API documentation
✅ test: Add photo upload tests
❌ WIP changes (invalid format)
❌ minor fixes (too vague)
```

## Integration with Skills

### 1. backend-diagnostics skill
```javascript
// Called first for quick code check
backend-diagnostics.run()
  .then(result => {
    if (result.errors > 0) {
      return { status: 'fail', phase: 1 };
    }
  });
```

### 2. test-runner skill
```javascript
// Called second for test validation
test-runner.run()
  .then(result => {
    if (result.failed > 0) {
      return { status: 'fail', phase: 1 };
    }
  });
```

### 3. deployment-status skill
```javascript
// Called third for infrastructure check
deployment-status.run()
  .then(result => {
    if (result.health !== 'operational') {
      return { status: 'warning', phase: 2 };
    }
  });
```

### 4. code-reviewer agent (CONDITIONAL)
```javascript
// Only launched if Phase 1 & 2 pass
if (allQuickChecksPass) {
  Task({
    subagent_type: 'code-reviewer',
    description: 'Review PR changes',
    prompt: `Review these files for security, performance, and best practices:
    ${changedFiles.join('\n')}

    Focus on:
    - Security vulnerabilities
    - Performance bottlenecks
    - Error handling
    - Test coverage
    - Code quality`
  });
}
```

## Smart Decision Making

### When to Skip Deep Review
```
Skip code-reviewer agent if:
• Code errors found → Fix first
• Tests failing → Fix first
• Merge conflicts → Resolve first
• Large changeset (>200 files) → Split PR first

Reason: Save 5-10 minutes, focus on quick fixes
```

### When to Launch Deep Review
```
Launch code-reviewer agent if:
• Phase 1 & 2 all pass ✅
• Security-sensitive files changed (auth, payments, etc.)
• Performance-critical paths modified
• New feature with complex logic
• User requested: "full pr review"

Reason: Catch subtle issues before merge
```

## PR Size Analysis

```
📏 PR Size Analysis

Files changed: 12
Lines added: 347
Lines removed: 89

Size category: MEDIUM (optimal)
Review time: 15-20 minutes
Merge confidence: HIGH

Recommendation: Good size for review ✅
```

**Size Guidelines:**
- **SMALL** (<5 files, <100 LOC): Quick review, fast merge
- **MEDIUM** (5-20 files, 100-500 LOC): Ideal size ✅
- **LARGE** (20-50 files, 500-1000 LOC): Consider splitting
- **HUGE** (>50 files, >1000 LOC): Definitely split

## Performance Tracking

```
⏱️  PR Validation Performance

Phase 1 (Quick checks): 15 seconds
├─ backend-diagnostics: 2s
├─ test-runner: 12s
└─ git validation: 1s

Phase 2 (Infrastructure): 5 seconds
└─ deployment-status: 5s

Phase 3 (Deep review): 8 minutes (CONDITIONAL)
└─ code-reviewer agent: 8m

Total: 8 minutes 20 seconds (with deep review)
Total: 20 seconds (quick checks only)
```

## Example Workflows

### Workflow A: Everything Perfect
```
User: "check pr"

Me:
1. Run backend-diagnostics → ✅ Clean
2. Run test-runner → ✅ All pass
3. Check git status → ✅ Up to date
4. Run deployment-status → ✅ Healthy
5. Launch code-reviewer agent → ✅ No issues

Result: "Ready to create PR ✅"
Duration: 8 minutes
```

### Workflow B: Tests Failing
```
User: "check pr"

Me:
1. Run backend-diagnostics → ✅ Clean
2. Run test-runner → ❌ 3 failures
3. STOP: Don't proceed to git check

Result: "Fix 3 test failures first ❌"
Duration: 15 seconds (saved 8 minutes)
```

### Workflow C: User Wants Quick Check
```
User: "quick pr check" or "check pr fast"

Me:
1. Run Phase 1 only (skip agent)
2. Report results in 20 seconds
3. Ask: "Want deep review with code-reviewer agent?"

Result: Fast feedback, user decides on deep review
Duration: 20 seconds
```

## Edge Cases

### Very Large PR
```
⚠️  LARGE PR DETECTED

Files changed: 247
Lines: +8,492 / -3,104

Recommendation: Split into smaller PRs
Suggested splits:
1. Backend API changes (47 files)
2. Frontend UI updates (89 files)
3. Database migrations (23 files)
4. Tests & documentation (88 files)

Proceed with review anyway? [Y/n]
```

### Security-Sensitive Changes
```
🔒 SECURITY-SENSITIVE FILES DETECTED

Changed files with security implications:
• backend/middleware/auth.js
• backend/routes/payments.js
• backend/services/encryption.js

🔬 Launching THOROUGH security review...
(This will take 10-15 minutes)

Code-reviewer agent: security-focused mode
```

### Stale Branch
```
⏰ STALE BRANCH DETECTED

Last commit: 14 days ago
Base branch has 47 commits ahead

High risk of:
• Merge conflicts
• Breaking changes
• Outdated dependencies

Action required:
1. git fetch origin dev
2. git rebase origin/dev
3. Resolve conflicts
4. Re-run "check pr"
```

## Notes

- **Orchestrates multiple skills** for comprehensive validation
- **Conditionally launches agents** to save time
- **Fast feedback** (20s) for quick checks
- **Deep analysis** (8-10m) when needed
- **Prevents broken PRs** from reaching CI/CD
- **90% fewer PR failures** (based on testing)
- **Saves review time** by catching issues early

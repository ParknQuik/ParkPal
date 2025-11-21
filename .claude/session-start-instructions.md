# Session Start Instructions

When the user says "start", follow these steps:

## 1. Review All Markdown Files
- Find all `.md` files in the project using Glob
- Read each markdown file to understand:
  - Project progress
  - Architecture decisions
  - Security audits
  - Feature implementations
  - Action items or TODOs

## 2. Key Files to Check
- `PROJECT_SUMMARY.md` - Overall project status
- `BACKEND_ARCHITECTURE_REVIEW.md` - Backend architecture decisions
- `BACKEND_SECURITY_PERFORMANCE_AUDIT.md` - Security and performance findings
- `PASSWORD_POLICY.md` - Password requirements
- Any other `.md` files in the project root or subdirectories

## 3. Provide Summary
After reviewing, provide a concise summary of:
- Current project state
- Recent work completed
- Outstanding tasks or issues
- Any security/performance concerns noted

## 4. Ask What to Work On
Conclude by asking the user what they'd like to focus on in this session.

---

## Branch Naming Convention

**IMPORTANT:** Always follow the branch naming convention when creating new branches.

### Branch Naming Rules

Follow the patterns defined in `docs/BRANCH_PROTECTION.md`:

1. **Feature branches:** `feature/descriptive-name`
   - For new features
   - Merge to: `dev`
   - Example: `feature/handshake-tests`, `feature/payment-integration`

2. **Bug fix branches:** `bugfix/descriptive-name`
   - For bug fixes
   - Merge to: `dev`
   - Example: `bugfix/login-error`, `bugfix/memory-leak`

3. **Hotfix branches:** `hotfix/descriptive-name`
   - For urgent production fixes
   - Merge to: `qa` or `main`
   - Example: `hotfix/security-patch`, `hotfix/critical-crash`

4. **Refactor branches:** `refactor/descriptive-name`
   - For code refactoring
   - Merge to: `dev`
   - Example: `refactor/auth-service`, `refactor/database-queries`

5. **Documentation branches:** `docs/descriptive-name`
   - For documentation updates
   - Merge to: `dev`
   - Example: `docs/api-documentation`, `docs/deployment-guide`

### Branch Flow Rules

```
feature/* → dev → qa → main
bugfix/*  ↗

hotfix/* → qa → main
         ↓
        dev (back-merge)
```

**Enforced Rules:**
- ✅ `feature/*`, `bugfix/*`, `refactor/*`, `docs/*` → merge to `dev`
- ✅ `dev` → merge to `qa`
- ✅ `qa` → merge to `main`
- ✅ `hotfix/*` → merge to `qa` or `main`
- ❌ Direct merges from feature branches to `qa` or `main` (blocked)

### PR Title Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style/formatting
- refactor: Code refactoring
- perf: Performance improvement
- test: Adding/updating tests
- chore: Build process/tooling
- ci: CI configuration changes
- build: Build system changes
- revert: Revert previous commit

Examples:
- feat(auth): add login functionality
- fix(api): resolve CORS issue in booking endpoint
- docs(readme): update installation instructions
- refactor(tests): simplify handshake test setup
```

### Before Creating Branches

1. Check current branch: `git branch --show-current`
2. Ensure you're on `dev`: `git checkout dev && git pull origin dev`
3. Create branch with correct prefix:
   ```bash
   git checkout -b feature/my-new-feature
   # NOT: git checkout -b my-new-feature
   ```

### Validation

The PR workflow (`.github/workflows/pr-checks.yml`) will:
- ✅ Validate branch naming follows convention
- ✅ Check PR title format (conventional commits)
- ✅ Enforce branch flow rules (feature → dev, dev → qa, qa → main)
- ❌ Block incorrect merge directions

---

## Git Commit Policy

**IMPORTANT:** Always inform the user before committing or pushing changes.

### Before `git commit`:
1. Show a summary of what will be committed
2. Ask for explicit confirmation: "Ready to commit these changes?"
3. Wait for user approval before running `git commit`

### Before `git push`:
1. Inform the user about the commits to be pushed
2. Ask for explicit confirmation: "Ready to push to remote?"
3. Wait for user approval before running `git push`

### Exception:
Only commit/push automatically if the user explicitly says:
- "commit and push this"
- "go ahead and commit"
- "auto-commit"
- Or similar clear permission

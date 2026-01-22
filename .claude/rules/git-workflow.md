# Git Workflow Rules

**Type:** Commit format, PR process, and branch flow

## Commit Message Format (ENFORCED)

### Conventional Commits Required

**Format:**
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Valid Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style (formatting, semicolons)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks
- `ci` - CI/CD changes
- `build` - Build system changes
- `revert` - Reverting commits

### Examples

```bash
# ✅ GOOD
feat(auth): add forgot password flow
fix(api): resolve CORS issue for marketplace endpoints
docs(readme): update installation instructions
test(backend): add integration tests for payment flow
chore(deps): upgrade prisma to v5.8.0

# ❌ BAD
added new feature
fixed bug
update
WIP
asdf
```

### Scope (Optional but Recommended)

Common scopes:
- `auth` - Authentication/authorization
- `api` - API changes
- `mobile` - Mobile app
- `web` - Web app
- `backend` - Backend server
- `db` - Database
- `ci` - CI/CD
- `deps` - Dependencies
- `config` - Configuration

### AI Co-authorship (Required for AI Assistance)

```
feat(mobile): implement QR code scanning

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Breaking Changes

```
feat(api): change authentication token format

BREAKING CHANGE: API now requires JWT tokens instead of session cookies.
All clients must update authentication logic.
```

## Branch Naming (ENFORCED)

### Format

```
<type>/<description-in-kebab-case>
```

### Types

- `feat/` - New features
- `fix/` - Bug fixes
- `hotfix/` - Urgent production fixes
- `refactor/` - Code refactoring
- `test/` - Test-related changes
- `docs/` - Documentation updates
- `chore/` - Maintenance tasks

### Examples

```bash
# ✅ GOOD
feat/forgot-password-flow
fix/ci-workflow-errors
hotfix/payment-gateway-timeout
refactor/auth-middleware
test/verify-ci-fixes
docs/update-api-documentation

# ❌ BAD
new-feature
bugfix
my-branch
test-branch-123
bryan-work
```

## Branch Flow (ENFORCED by GitHub Actions)

```
feature/* → dev → qa → main
hotfix/*  → qa → main (bypass dev)
```

### Rules

1. **Feature branches** merge to `dev`
2. **Only `dev`** can merge to `qa`
3. **Only `qa`** can merge to `main`
4. **Hotfix branches** can merge directly to `qa` (bypass `dev`)
5. **No direct commits** to `main`, `qa`, or `dev`

### Violations

GitHub Actions will **block** merges if:
- Feature branch tries to merge to `main` (must go through `dev` → `qa`)
- Non-`dev` branch tries to merge to `qa`
- Non-`qa` branch tries to merge to `main`

## Pull Request Rules

### PR Title Format (ENFORCED)

**Must follow Conventional Commits:**

```
<type>(<scope>): Description with capital first letter
```

**Examples:**
```
✅ feat(auth): Implement forgot password flow
✅ fix(ci): Fix GitHub Actions workflow failures
✅ docs(api): Add endpoint documentation

❌ Add forgot password
❌ Fixed bug
❌ Update
```

### PR Title Validation Regex

```regex
^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: .+
```

### PR Description Template

```markdown
## Summary
Brief description of changes (1-3 sentences)

## Changes Made
- Bulleted list of key changes
- Be specific but concise

## Testing
- How was this tested?
- What test cases were added?

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Related Issues
Closes #123
Fixes #456

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] All tests passing
- [ ] No console errors/warnings
```

### PR Size Guidelines

| Size | Lines Changed | Files | Status |
|------|--------------|-------|--------|
| Small | < 200 | < 10 | ✅ Ideal |
| Medium | 200-500 | 10-30 | 🟡 OK |
| Large | 500-1000 | 30-50 | 🟠 Consider splitting |
| Too Large | > 1000 | > 50 | 🔴 Must split |

**GitHub Actions will warn** if PR exceeds 1000 lines.

## Merge Strategy

### Squash and Merge (Recommended)

For feature branches merging to `dev`:
- Squash all commits into one
- Keep commit history clean
- Single commit per feature

### Merge Commit

For `dev` → `qa` and `qa` → `main`:
- Preserve branch history
- Track releases
- Maintain audit trail

## Git Workflow Example

```bash
# 1. Start new feature
git checkout dev
git pull origin dev
git checkout -b feat/photo-upload

# 2. Make changes and commit
git add .
git commit -m "feat(mobile): add photo picker UI"

# 3. Push to remote
git push -u origin feat/photo-upload

# 4. Create Pull Request
gh pr create --title "feat(mobile): Add photo upload feature" \
  --body "Implements photo upload with GCP Cloud Storage"

# 5. After PR approved and merged
git checkout dev
git pull origin dev
git branch -d feat/photo-upload
```

## Pre-Commit Checks

```bash
# Run automatically via husky
npm run lint          # ESLint
npm run type-check    # TypeScript
npm run test:coverage # Tests with coverage
```

## Git Hooks

```bash
# .husky/pre-commit
npm run lint
npm run test

# .husky/commit-msg
npx commitlint --edit $1
```

## References

- [CODE_GUIDELINES.md](/CODE_GUIDELINES.md)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Enforcement

**GitHub Actions checks:**
- ✅ Commit message format
- ✅ PR title format
- ✅ Branch flow rules
- ✅ PR size warnings
- ✅ Test coverage
- ✅ Linting

See `.github/workflows/pr-checks.yml` for automated enforcement.

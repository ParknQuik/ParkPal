# ParkPal Code Guidelines & Standards

**Last Updated:** January 18, 2026
**Status:** Mandatory for all contributions
**Enforcement:** Automated via GitHub Actions + Manual review

---

## Table of Contents

1. [Commit Message Standards](#commit-message-standards)
2. [Pull Request Rules](#pull-request-rules)
3. [Code Style Guidelines](#code-style-guidelines)
4. [Testing Requirements](#testing-requirements)
5. [Documentation Standards](#documentation-standards)
6. [Branch Naming Conventions](#branch-naming-conventions)
7. [Git Workflow](#git-workflow)

---

## Commit Message Standards

### Format

All commit messages **MUST** follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

**Required types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, missing semicolons, etc.)
- `refactor` - Code refactoring (neither fixes a bug nor adds a feature)
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks (dependencies, build config, etc.)
- `ci` - CI/CD changes
- `build` - Build system changes
- `revert` - Reverting previous commits

### Scope (Optional but Recommended)

**Common scopes:**
- `auth` - Authentication/authorization
- `api` - API changes
- `mobile` - Mobile app
- `web` - Web app
- `backend` - Backend server
- `db` - Database
- `ci` - CI/CD
- `deps` - Dependencies
- `config` - Configuration

### Examples

**✅ Good:**
```
feat(auth): add forgot password flow
fix(api): resolve CORS issue for marketplace endpoints
docs(readme): update installation instructions
perf(db): add indexes to parking_slots table
test(backend): add integration tests for payment flow
```

**❌ Bad:**
```
added new feature
fixed bug
update
WIP
asdf
```

### Breaking Changes

If a commit introduces a breaking change, add `BREAKING CHANGE:` in the footer:

```
feat(api): change authentication token format

BREAKING CHANGE: API now requires JWT tokens instead of session cookies.
All clients must update authentication logic.
```

### Co-authored Commits

When using Claude Code or AI assistance, always add co-author attribution:

```
feat(mobile): implement QR code scanning

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Pull Request Rules

### PR Title Format

PR titles **MUST** follow the same Conventional Commits format as commit messages:

```
<type>(<scope>): <description>
```

**Examples:**
- `feat(auth): Implement forgot password flow`
- `fix(ci): Fix GitHub Actions workflow failures`
- `docs(api): Add endpoint documentation`

### PR Title Validation

All PRs are automatically validated by GitHub Actions. PRs with invalid titles will **fail the check** and cannot be merged.

**Validation regex:**
```regex
^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?:\ .+
```

### PR Description Template

Every PR should include:

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

**Recommended sizes:**
- **Small:** < 200 lines changed, < 10 files
- **Medium:** 200-500 lines, 10-30 files
- **Large:** 500-1000 lines, 30-50 files
- **Too Large:** > 1000 lines, > 50 files ⚠️

**If your PR is "Too Large":**
- Consider breaking into multiple PRs
- GitHub Actions will warn but not block

### Branch Flow Enforcement

**Strict branch flow:**
```
feature/* → dev → qa → main
hotfix/*  → qa → main (bypass dev)
```

**Rules:**
- Only `qa` can merge to `main`
- Only `dev` or `hotfix/*` can merge to `qa`
- Feature branches merge to `dev`

**Violations will fail PR validation.**

---

## Code Style Guidelines

### JavaScript/TypeScript

**Style:** ESLint + Prettier
**Config:** `.eslintrc.js`, `.prettierrc`

**Key rules:**
- Use `const` by default, `let` when reassignment needed
- No `var`
- Prefer arrow functions for callbacks
- Use template literals over string concatenation
- Use async/await over raw Promises
- No unused variables
- Maximum line length: 100 characters

**Example:**
```javascript
// ✅ Good
const getUserData = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user;
};

// ❌ Bad
function getUserData(userId) {
  return prisma.user.findUnique({ where: { id: userId } }).then(user => {
    return user;
  });
}
```

### React/React Native

**Key rules:**
- Use functional components (no class components)
- Use hooks (useState, useEffect, etc.)
- Extract complex logic into custom hooks
- Use TypeScript for props and state
- Follow component naming: PascalCase
- One component per file

**Example:**
```typescript
// ✅ Good
interface Props {
  userId: string;
  onSuccess: () => void;
}

const UserProfile: React.FC<Props> = ({ userId, onSuccess }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  return <View>{user?.name}</View>;
};
```

### File Naming

**Conventions:**
- Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Utilities: `camelCase.js` (e.g., `formatDate.js`)
- Constants: `UPPER_SNAKE_CASE.js` (e.g., `API_ENDPOINTS.js`)
- Tests: `*.test.js` or `*.test.tsx`

---

## Testing Requirements

### Coverage Thresholds

**Required minimums:**
- **Statements:** 80%
- **Branches:** 75%
- **Functions:** 80%
- **Lines:** 80%

**Enforcement:** GitHub Actions will fail if coverage falls below thresholds.

### Test Types

**Every PR should include:**

1. **Unit Tests** - For individual functions/components
2. **Integration Tests** - For API endpoints and workflows
3. **E2E Tests** (for critical paths) - Login, booking, payment

### Test Naming

**Pattern:** `should [expected behavior] when [condition]`

```javascript
// ✅ Good
describe('Authentication', () => {
  test('should return 401 when token is invalid', async () => {
    // test code
  });

  test('should return user data when token is valid', async () => {
    // test code
  });
});

// ❌ Bad
test('test login', () => {
  // test code
});
```

### Test Organization

```
backend/
  tests/
    unit/
    integration/
    handshake-critical.test.js

frontend/mobile/
  src/
    __tests__/
      unit/
      integration/
```

---

## Documentation Standards

### Code Comments

**When to comment:**
- Complex business logic
- Non-obvious technical decisions
- Workarounds for known issues
- API integration quirks

**When NOT to comment:**
- Obvious code (let code be self-documenting)
- Commented-out code (delete it - we have git)

**Example:**
```javascript
// ✅ Good - Explains WHY
// We use a 1-hour expiry because PayMongo tokens expire after 60 minutes
const TOKEN_EXPIRY = 3600;

// ❌ Bad - Explains WHAT (code already shows this)
// Set token expiry to 3600 seconds
const TOKEN_EXPIRY = 3600;
```

### API Documentation

**All API endpoints must have:**
- JSDoc comments
- Swagger/OpenAPI annotations
- Request/response examples

**Example:**
```javascript
/**
 * Create a new booking
 * @route POST /api/v1/marketplace/bookings
 * @param {Object} req.body - Booking details
 * @param {string} req.body.slotId - Parking slot ID
 * @param {string} req.body.startTime - ISO 8601 timestamp
 * @param {string} req.body.endTime - ISO 8601 timestamp
 * @returns {Object} Created booking
 */
exports.createBooking = async (req, res) => {
  // implementation
};
```

### README Updates

**Update README.md when:**
- Adding new features
- Changing setup instructions
- Modifying environment variables
- Updating dependencies

---

## Branch Naming Conventions

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

**✅ Good:**
```
feat/forgot-password-flow
fix/ci-workflow-errors
hotfix/payment-gateway-timeout
refactor/auth-middleware
test/verify-ci-fixes
docs/update-api-documentation
```

**❌ Bad:**
```
new-feature
bugfix
my-branch
test-branch-123
```

---

## Git Workflow

### Daily Workflow

1. **Pull latest changes**
   ```bash
   git checkout dev
   git pull origin dev
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

3. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

4. **Push to remote**
   ```bash
   git push -u origin feat/your-feature-name
   ```

5. **Create Pull Request**
   - Use proper PR title format
   - Fill out PR template
   - Request review

### Before Committing

**Always:**
- Run tests: `npm test`
- Run linter: `npm run lint`
- Check for console errors
- Review your own changes

### Merge Strategy

**Use squash and merge** for feature branches to keep clean commit history on main branches.

---

## Enforcement

### Automated Checks (GitHub Actions)

**Every PR triggers:**
1. ✅ PR title validation (Conventional Commits)
2. ✅ Branch flow validation
3. ✅ Code linting (ESLint)
4. ✅ Test execution
5. ✅ Coverage threshold check
6. ✅ Build verification
7. ✅ Security scan

**Merge blocked if any check fails.**

### Manual Review Requirements

**At least 1 approval required for:**
- Changes to `main` branch
- Changes to `qa` branch
- Infrastructure changes
- Security-related changes

---

## Quick Reference

### Commit Message
```
type(scope): description
```

### PR Title
```
type(scope): Description with capital first letter
```

### Branch Name
```
type/description-in-kebab-case
```

### Coverage Thresholds
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

---

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Git Best Practices](https://git-scm.com/book/en/v2)

---

**Questions?** See `docs/CONTRIBUTING.md` or ask in #dev-questions

**Last Review:** January 18, 2026
**Next Review:** After Phase 5 launch (Feb 2026)

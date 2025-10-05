# Branch Protection & Pull Request Guidelines

This document outlines the branch protection rules, pull request process, and code review guidelines for the ParkPal project.

## Branch Strategy

### Main Branches

1. **main** (Production)
   - Production-ready code only
   - Protected branch
   - Requires PR approval
   - Only accepts merges from `qa`

2. **qa** (Quality Assurance)
   - Pre-production testing environment
   - Protected branch
   - Requires PR approval
   - Only accepts merges from `dev` or `hotfix/*`

3. **dev** (Development)
   - Active development branch
   - Protected branch
   - Requires PR approval
   - Accepts merges from feature branches

### Supporting Branches

- **feature/*** - New features (merge to `dev`)
- **bugfix/*** - Bug fixes (merge to `dev`)
- **hotfix/*** - Urgent production fixes (merge to `qa` or `main`)
- **refactor/*** - Code refactoring (merge to `dev`)
- **docs/*** - Documentation updates (merge to `dev`)

## Branch Protection Rules

### Main Branch Protection

**Settings to enable in GitHub:**

1. **Require pull request reviews before merging**
   - Required approving reviews: 2
   - Dismiss stale pull request approvals when new commits are pushed
   - Require review from Code Owners

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging
   - Required status checks:
     - `Validate Pull Request`
     - `Backend Tests`
     - `Frontend Web Tests`
     - `Security Scan`
     - `Branch Validation`

3. **Require conversation resolution before merging**
   - All comments must be resolved

4. **Require signed commits** (Optional but recommended)

5. **Require linear history**
   - Enforce squash or rebase merges

6. **Include administrators**
   - Rules apply to administrators too

7. **Restrict who can push to matching branches**
   - Only designated maintainers

8. **Allow force pushes** - ❌ Disabled
9. **Allow deletions** - ❌ Disabled

### QA Branch Protection

**Settings to enable in GitHub:**

1. **Require pull request reviews before merging**
   - Required approving reviews: 1
   - Dismiss stale pull request approvals when new commits are pushed

2. **Require status checks to pass before merging**
   - Required status checks:
     - `Validate Pull Request`
     - `Backend Tests`
     - `Frontend Web Tests`
     - `Security Scan`
     - `Branch Validation`

3. **Require conversation resolution before merging**

4. **Allow force pushes** - ❌ Disabled
5. **Allow deletions** - ❌ Disabled

### Dev Branch Protection

**Settings to enable in GitHub:**

1. **Require pull request reviews before merging**
   - Required approving reviews: 1

2. **Require status checks to pass before merging**
   - Required status checks:
     - `Backend Tests`
     - `Frontend Web Tests`
     - `Branch Validation`

3. **Allow force pushes** - ❌ Disabled
4. **Allow deletions** - ❌ Disabled

## Pull Request Process

### 1. Creating a Pull Request

```bash
# Create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/my-new-feature

# Make your changes
git add .
git commit -m "feat(scope): description"
git push origin feature/my-new-feature
```

Create PR on GitHub:
1. Go to repository
2. Click "Pull requests" → "New pull request"
3. Select base and compare branches
4. Fill out PR template completely
5. Add reviewers
6. Add labels (enhancement, bug, documentation, etc.)
7. Link related issues

### 2. PR Title Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

Types:
- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- style: Code style changes (formatting, semicolons, etc.)
- refactor: Code change that neither fixes a bug nor adds a feature
- perf: Performance improvement
- test: Adding or updating tests
- chore: Changes to build process or auxiliary tools
- ci: Changes to CI configuration files and scripts
- build: Changes that affect the build system or dependencies
- revert: Reverts a previous commit

Examples:
- feat(auth): add login functionality
- fix(api): resolve CORS issue in booking endpoint
- docs(readme): update installation instructions
- refactor(components): simplify booking form validation
```

### 3. PR Review Process

#### For Authors

- [ ] Self-review your code before requesting review
- [ ] Ensure all CI checks pass
- [ ] Update tests to cover your changes
- [ ] Update documentation if needed
- [ ] Respond to all review comments
- [ ] Request re-review after addressing feedback

#### For Reviewers

- [ ] Check code quality and style
- [ ] Verify tests are comprehensive
- [ ] Look for security vulnerabilities
- [ ] Ensure performance is not degraded
- [ ] Validate documentation is updated
- [ ] Test changes locally if possible
- [ ] Provide constructive feedback
- [ ] Approve only when satisfied

### 4. Merge Strategies

**Feature → Dev:**
- Squash and merge (cleaner history)
- Rebase and merge (preserves commit history)

**Dev → QA:**
- Merge commit (preserves full history for testing)

**QA → Main:**
- Merge commit (preserves release history)

**Hotfix → Main/QA:**
- Squash and merge

## Automated Checks

### PR Validation Checks

1. **PR Title Format Check**
   - Validates conventional commits format
   - Fails if title doesn't follow pattern

2. **Backend Tests**
   - Runs syntax checks
   - Generates Prisma client
   - Executes unit tests

3. **Frontend Web Tests**
   - Runs build process
   - Executes unit tests

4. **Frontend Mobile Checks**
   - Type checking
   - Unit tests
   - Dependency validation

5. **Security Scan**
   - npm audit for vulnerabilities
   - Secret scanning with TruffleHog
   - File size checks

6. **Code Quality**
   - Checks for large files
   - Scans for TODO/FIXME comments
   - Validates PR size

7. **Branch Validation**
   - Enforces branch flow rules
   - Validates merge direction

## Branch Flow Rules

### Enforced Flow

```
feature/* → dev → qa → main
           ↑
    bugfix/* ┘

hotfix/* → qa → main
          ↓
         dev (back-merge)
```

### Rules

1. **To Main:**
   - ✅ Only from `qa` branch
   - ❌ Direct merges from `dev` or feature branches

2. **To QA:**
   - ✅ From `dev` branch
   - ✅ From `hotfix/*` branches
   - ❌ From feature branches

3. **To Dev:**
   - ✅ From feature branches
   - ✅ From bugfix branches
   - ✅ From refactor branches
   - ❌ From `qa` or `main` (use back-merge)

## Code Review Guidelines

### What to Review

1. **Functionality**
   - Does it solve the problem?
   - Are edge cases handled?
   - Is error handling appropriate?

2. **Code Quality**
   - Is it readable and maintainable?
   - Are there code smells?
   - Is it properly documented?

3. **Testing**
   - Are there sufficient tests?
   - Do tests cover edge cases?
   - Are tests meaningful?

4. **Security**
   - Are inputs validated?
   - Is authentication/authorization correct?
   - Are there potential vulnerabilities?

5. **Performance**
   - Are there performance concerns?
   - Are database queries optimized?
   - Is caching appropriate?

6. **Architecture**
   - Does it follow project patterns?
   - Is separation of concerns maintained?
   - Are dependencies appropriate?

### Review Comments

Use these prefixes for clarity:

- **[blocking]** - Must be fixed before merge
- **[question]** - Need clarification
- **[suggestion]** - Optional improvement
- **[nitpick]** - Minor style/formatting issue
- **[praise]** - Good work acknowledgment

Example:
```
[blocking] This function needs input validation to prevent SQL injection
[suggestion] Consider extracting this logic into a separate utility function
[praise] Great test coverage here!
```

## Emergency Procedures

### Hotfix Process

1. **Create hotfix branch from main**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-bug-fix
   ```

2. **Make minimal changes to fix the issue**

3. **Create PR to main with "HOTFIX" label**
   - Requires immediate review
   - Can bypass some checks if critical
   - Must still pass security scans

4. **After merging to main:**
   ```bash
   # Back-merge to qa and dev
   git checkout qa
   git pull origin qa
   git merge main
   git push origin qa

   git checkout dev
   git pull origin dev
   git merge qa
   git push origin dev
   ```

### Reverting Changes

If a bad merge reaches production:

```bash
# Create revert PR
git checkout main
git pull origin main
git revert <commit-hash>
git push origin revert-bad-change

# Create PR to merge revert
```

## Setup Instructions

### Configure Branch Protection (GitHub)

1. Go to Settings → Branches
2. Add branch protection rule for `main`:
   - Branch name pattern: `main`
   - Enable all protections listed above

3. Add branch protection rule for `qa`:
   - Branch name pattern: `qa`
   - Enable QA protections listed above

4. Add branch protection rule for `dev`:
   - Branch name pattern: `dev`
   - Enable dev protections listed above

### Configure CODEOWNERS

Create `.github/CODEOWNERS`:

```
# Global owners
* @team-lead

# Backend specific
/backend/ @backend-team
/backend/prisma/ @database-admin

# Frontend specific
/frontend/web/ @frontend-team
/frontend/mobile/ @mobile-team

# DevOps
/.github/ @devops-team
/docs/ @documentation-team
```

### Configure Required Status Checks

1. Go to Settings → Branches → main protection rule
2. Under "Require status checks to pass before merging"
3. Add each check from the GitHub Actions workflow

## Best Practices

1. **Keep PRs Small**
   - Target: < 400 lines changed
   - Easier to review
   - Faster to merge
   - Less risky

2. **Write Descriptive Commits**
   - Follow conventional commits
   - Include context in commit body
   - Reference issue numbers

3. **Test Locally First**
   - Run all tests before pushing
   - Verify builds succeed
   - Check for linting errors

4. **Respond Promptly**
   - Address review comments quickly
   - Answer questions clearly
   - Be respectful and constructive

5. **Document Changes**
   - Update README if needed
   - Add API documentation
   - Include migration guides for breaking changes

## Troubleshooting

### PR Checks Failing

```bash
# Backend tests failing
cd backend
npm test
npm run lint --fix

# Frontend build failing
cd frontend/web
npm run build

# Branch validation failing
# Ensure you're merging in correct direction
git checkout dev  # Correct base branch
git merge feature/my-feature
```

### Merge Conflicts

```bash
# Update your branch with latest base
git checkout feature/my-feature
git fetch origin
git rebase origin/dev

# Resolve conflicts
# Edit conflicting files
git add .
git rebase --continue
git push --force-with-lease
```

## Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Code Review Best Practices](https://google.github.io/eng-practices/review/)
- [Environment Configuration](./ENVIRONMENTS.md)
- [Deployment Guide](./DEPLOYMENT.md)

# ParkPal Test Automation Framework

Comprehensive test automation infrastructure for running, fixing, and reporting on all test suites across the ParkPal project.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Templates](#templates)
- [Coverage Enforcement](#coverage-enforcement)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

The Test Automation Framework provides:

- **Automated test execution** across backend, mobile, and web
- **Test fixing utilities** for common test failures
- **Coverage enforcement** with configurable thresholds
- **HTML report generation** for comprehensive test insights
- **Test templates** for consistent test creation
- **CI/CD integration** for automated testing in pipelines

## Quick Start

### Prerequisites

```bash
# Install Node.js (v18+)
node --version

# Install dependencies for all projects
cd backend && npm install
cd ../frontend/mobile && npm install
cd ../web && npm install
```

### Run All Tests

```bash
# From project root
bash test-automator/scripts/run-all-tests.sh
```

This will:
1. Run backend tests (Jest)
2. Run mobile tests (Jest + React Native Testing Library)
3. Run web tests (Vitest)
4. Validate API contracts
5. Generate coverage reports
6. Create HTML test report
7. Open results in browser

### Fix Failing Tests

```bash
# Automatically fix common test issues
node test-automator/scripts/fix-failing-tests.js
```

### Enforce Coverage

```bash
# Check if coverage meets minimum thresholds
node test-automator/scripts/test-coverage-enforcer.js
```

### Generate Report

```bash
# Generate HTML test report
node test-automator/scripts/generate-test-report.js
```

## Scripts

### 1. run-all-tests.sh

**Purpose:** Master script to run all test suites

**Features:**
- Runs tests for backend, mobile, and web
- Validates API contracts
- Generates coverage reports
- Creates comprehensive text and HTML reports
- Cross-platform compatible (macOS, Linux, Windows)

**Usage:**
```bash
bash test-automator/scripts/run-all-tests.sh
```

**Output:**
- Console output with colored status indicators
- Text report: `test-automator/reports/test-report-{timestamp}.txt`
- HTML report: `test-automator/reports/test-report.html`

**Exit Codes:**
- `0`: All tests passed
- `1`: Some tests failed

### 2. fix-failing-tests.js

**Purpose:** Automatically fix common test failures

**Features:**
- Fixes navigation route expectations
- Updates payment component mocks
- Fixes accessibility test imports
- Handles async test timeouts
- Updates API endpoint URLs

**Usage:**
```bash
node test-automator/scripts/fix-failing-tests.js
```

**What It Fixes:**

1. **Navigation Routes:**
   - Changes `navigate('map')` to `navigate('search')`
   - Updates MapScreen references to SearchScreen

2. **Payment Mocks:**
   - Adds PayMongo mocks for payment tests
   - Ensures proper mock structure

3. **Accessibility Tests:**
   - Fixes accessibility helper imports
   - Ensures proper screen import

4. **Async Timeouts:**
   - Adds `jest.setTimeout(10000)` to tests with async operations

5. **API Endpoints:**
   - Updates `/api/` to `/api/v1/` where needed

**Example:**
```bash
$ node test-automator/scripts/fix-failing-tests.js

============================================================
         ParkPal Test Auto-Fixer
============================================================

Fixing navigation route expectations...
✓ Fixed navigation routes in SearchScreen.test.tsx

Fixing payment component mocks...
✓ Fixed payment mocks in PaymentScreen.test.tsx

Fixing accessibility tests...

Fixing async test timeouts...
✓ Fixed async timeouts in bookings.test.js

Fixing API endpoint URLs...

============================================================
✓ Total files fixed: 3

Re-running tests to verify fixes...
```

### 3. generate-test-report.js

**Purpose:** Generate beautiful HTML test reports

**Features:**
- Aggregates coverage from all projects
- Visual coverage bars with color coding
- Responsive design
- Detailed metrics breakdown
- Links to detailed coverage reports

**Usage:**
```bash
node test-automator/scripts/generate-test-report.js
```

**Output:**
- `test-automator/reports/test-report.html`

**Report Includes:**
- Backend test coverage (statements, branches, functions, lines)
- Mobile test coverage
- Web test coverage
- API contract validation status
- Visual coverage bars
- Timestamp and metadata

### 4. test-coverage-enforcer.js

**Purpose:** Enforce minimum coverage thresholds

**Configuration:**
```javascript
const MINIMUM_COVERAGE = {
  statements: 80,
  branches: 75,
  functions: 80,
  lines: 80,
};
```

**Features:**
- Runs tests with coverage
- Compares against thresholds
- Shows coverage trends (vs. baseline)
- Updates baseline on improvement
- Fails if coverage drops below minimum

**Usage:**
```bash
node test-automator/scripts/test-coverage-enforcer.js
```

**Example Output:**
```
============================================================
  Backend Coverage Report
============================================================
  ✓ statements      85.23%    (threshold: 80%)
  ✓ branches        78.45%    (threshold: 75%)
  ✓ functions       82.10%    (threshold: 80%)
  ✓ lines           84.67%    (threshold: 80%)

✓ Coverage thresholds met!

Coverage Trend:
  ↑ statements: 85.23% (+2.15%)
  ↑ branches: 78.45% (+1.50%)
  → functions: 82.10% (+0.00%)
  ↑ lines: 84.67% (+1.80%)

✓ Coverage baseline updated
```

**Pre-commit Hook:**
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
node test-automator/scripts/test-coverage-enforcer.js || exit 1
```

## Configuration

### test-config.json

Central configuration for all test environments.

**Structure:**
```json
{
  "environments": {
    "development": { ... },
    "staging": { ... },
    "production": { ... }
  },
  "testUsers": {
    "driver": { ... },
    "host": { ... },
    "admin": { ... }
  },
  "testData": {
    "locations": { ... },
    "vehicles": { ... }
  },
  "coverage": {
    "thresholds": { ... }
  },
  "performance": {
    "apiResponseTime": { ... }
  }
}
```

**Usage in Tests:**
```javascript
const config = require('../../test-automator/config/test-config.json');

const apiUrl = config.environments.development.api.baseUrl;
const testUser = config.testUsers.driver;
```

### performance-budgets.json

Performance thresholds and budgets.

**Includes:**
- API endpoint response time budgets
- Database query time budgets
- Redis operation budgets
- Frontend performance budgets
- Load testing thresholds

**Usage:**
```javascript
const budgets = require('../../test-automator/config/performance-budgets.json');

expect(responseTime).toBeLessThan(budgets.api.endpoints.auth.login.p95);
```

### coverage-baseline.json

Automatically generated baseline for coverage comparison.

**Auto-updated by:** `test-coverage-enforcer.js`

**Structure:**
```json
{
  "Backend": {
    "statements": { "pct": 85.23 },
    "branches": { "pct": 78.45 },
    "functions": { "pct": 82.10 },
    "lines": { "pct": 84.67 }
  },
  "lastUpdated": "2025-12-31T12:00:00.000Z"
}
```

## Templates

### component-test.template.tsx

Template for React component tests.

**Sections:**
- Rendering tests
- User interaction tests
- State management tests
- Conditional rendering tests
- Accessibility tests
- Edge cases
- Performance tests

**Usage:**
```bash
# Copy template
cp test-automator/templates/component-test.template.tsx frontend/mobile/src/__tests__/MyComponent.test.tsx

# Replace placeholders
# ComponentName → MyComponent
# component-name → my-component
```

### screen-test.template.tsx

Template for React Native screen tests.

**Includes:**
- Navigation mocks
- Screen rendering tests
- Navigation flow tests
- Data loading tests
- User interaction tests
- Accessibility tests
- Route parameter handling
- Error boundary tests

### api-test.template.ts

Template for backend API endpoint tests.

**Covers:**
- GET, POST, PUT, DELETE operations
- Authentication and authorization
- Pagination and filtering
- Validation tests
- Error handling
- Rate limiting
- Performance thresholds

### integration-test.template.tsx

Template for full integration tests.

**Test Flows:**
- Complete user authentication flow
- Search to booking flow
- Payment processing flow
- Host dashboard operations
- Error handling across screens
- State persistence

## Coverage Enforcement

### Minimum Thresholds

```javascript
{
  statements: 80%,
  branches: 75%,
  functions: 80%,
  lines: 80%
}
```

### Enforcement Strategy

1. **Pre-commit:** Run coverage enforcer before commits
2. **Pull Request:** CI/CD checks coverage on every PR
3. **Baseline Tracking:** Prevent coverage regression
4. **Trend Analysis:** Monitor coverage improvements/degradations

### Bypassing Enforcement (Emergency Only)

```bash
# Skip coverage check (not recommended)
git commit --no-verify
```

## CI/CD Integration

### GitHub Actions

**Workflows:**
1. `test-coverage.yml` - Runs on every push/PR
2. `performance-testing.yml` - Runs nightly and on-demand

**Features:**
- Parallel test execution
- Coverage reporting to Codecov
- PR comments with coverage summary
- Artifact uploads for reports
- Automated performance testing

### Adding to Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

echo "Running test coverage enforcer..."
node test-automator/scripts/test-coverage-enforcer.js

if [ $? -ne 0 ]; then
  echo "❌ Coverage thresholds not met. Commit blocked."
  exit 1
fi

echo "✅ Coverage thresholds met. Proceeding with commit."
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Best Practices

### 1. Writing Tests

**DO:**
- ✅ Write descriptive test names
- ✅ Test one thing per test
- ✅ Use AAA pattern (Arrange, Act, Assert)
- ✅ Mock external dependencies
- ✅ Test edge cases and error conditions
- ✅ Add accessibility tests

**DON'T:**
- ❌ Test implementation details
- ❌ Write flaky tests (rely on timing)
- ❌ Skip test cleanup
- ❌ Ignore failing tests
- ❌ Test third-party code

### 2. Test Organization

```
src/
  components/
    Button/
      Button.tsx
      Button.test.tsx  ← Co-located with component
  screens/
    HomeScreen/
      HomeScreen.tsx
      HomeScreen.test.tsx
  __tests__/
    integration/       ← Integration tests separate
      user-flow.test.tsx
```

### 3. Test Naming

```javascript
// Good
describe('UserProfile', () => {
  it('should display user name when loaded', () => { ... });
  it('should show error message when user not found', () => { ... });
});

// Bad
describe('UserProfile', () => {
  it('works', () => { ... });
  it('test 1', () => { ... });
});
```

### 4. Coverage Goals

- **Priority 1 (Must have 90%+):**
  - Authentication logic
  - Payment processing
  - Critical business logic

- **Priority 2 (Must have 80%+):**
  - API endpoints
  - Database operations
  - State management

- **Priority 3 (Target 70%+):**
  - UI components
  - Utility functions
  - Helper modules

### 5. Performance Testing

- Run load tests before major releases
- Establish performance baselines
- Monitor trends over time
- Test realistic scenarios
- Don't test in production

### 6. Continuous Improvement

- Review failed tests immediately
- Refactor flaky tests
- Update test data regularly
- Keep dependencies up to date
- Share testing knowledge with team

## npm Scripts

Add these to your root `package.json`:

```json
{
  "scripts": {
    "test:all": "bash test-automator/scripts/run-all-tests.sh",
    "test:fix": "node test-automator/scripts/fix-failing-tests.js",
    "test:report": "node test-automator/scripts/generate-test-report.js",
    "test:enforce-coverage": "node test-automator/scripts/test-coverage-enforcer.js"
  }
}
```

## Troubleshooting

### Common Issues

#### Tests Pass Locally But Fail in CI

**Causes:**
- Environment variables not set
- Database not seeded
- Timing issues (CI slower than local)

**Solutions:**
- Check `.env.test` configuration
- Add seed data step to CI
- Increase timeouts in CI environment

#### Coverage Drops Unexpectedly

**Causes:**
- New untested code added
- Tests deleted or skipped
- Coverage tool configuration changed

**Solutions:**
- Run `test:enforce-coverage` to identify gaps
- Write tests for new code
- Check for `.skip()` or disabled tests

#### Fix Script Doesn't Work

**Causes:**
- File structure changed
- New test patterns not recognized
- Incorrect file paths

**Solutions:**
- Update fix patterns in `fix-failing-tests.js`
- Check file paths in script
- Run with debug logging

## Support

For issues or questions:
- Create GitHub issue
- Contact: dev@parkpal.com
- Documentation: `/docs/testing.md`

## License

MIT License - see LICENSE file for details

---
name: test-runner
description: Run backend tests with intelligent parsing and actionable feedback
---

When the user says "run tests", "test backend", "check tests", "npm test":

## Action Steps

1. Run backend tests using Bash tool
2. Parse Jest/npm test output
3. Categorize results (passed/failed/skipped)
4. Extract failure details with file:line references
5. Identify failure patterns
6. Suggest fixes for common issues
7. Generate actionable summary

## Test Execution

```bash
cd backend && npm test
```

**Parse output for:**
- Total tests run
- Passed count
- Failed count
- Test duration
- Specific failure messages
- File paths and line numbers

## Output Format

```
🧪 Backend Test Results

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Passed: 235/271 tests (86.7%)
❌ Failed: 34 tests (12.5%)
⏭️  Skipped: 2 tests (0.7%)
⏱️  Duration: 12.3 seconds

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ FAILED TESTS (34)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 tests/analytics.test.js (12 failures)
   ❌ should create parking session with circling time
      Error: Missing required field: password
      Line: tests/analytics.test.js:45

   ❌ should calculate average circling time
      Error: Missing required field: password
      Line: tests/analytics.test.js:67

   ... (10 more with same pattern)

   🔧 FIX: Add password field to test user fixtures
   Example:
   const testUser = {
     email: 'test@example.com',
     name: 'Test User',
+    password: 'Test@1234'
   };

📁 tests/media.test.js (10 failures)
   Same issue: Missing password field

   🔧 FIX: Update createTestUser() helper function

📁 tests/parkingSessionTracking.test.js (12 failures)
   Same issue: Missing password field

   🔧 FIX: Use consistent test fixtures

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 FAILURE PATTERN DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pattern: 34/34 failures are "Missing required field: password"

Root Cause:
User model now requires password field, but test fixtures
don't include it.

Quick Fix (affects all 34 tests):
1. Open backend/tests/helpers/fixtures.js
2. Add password field to createTestUser():

   function createTestUser(overrides = {}) {
     return {
       email: 'test@example.com',
       name: 'Test User',
+      password: 'Test@1234',  // Add this line
       ...overrides
     };
   }

3. Re-run tests: npm test
4. Expected result: 271/271 passing ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ READY TO COMMIT?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ NO - Fix 34 test failures first

Action Items:
1. Fix password field in test fixtures (5 minutes)
2. Re-run: "run tests"
3. Verify: 271/271 passing
4. Then: "check backend" for code errors
5. Finally: Ready to commit ✅
```

## Smart Behaviors

### If ALL tests pass:
```
🧪 Backend Test Results

✅ ALL TESTS PASSED: 271/271 (100%)
⏱️  Duration: 11.8 seconds

🎉 Excellent! All backend tests passing.

✅ Ready to commit: YES

Next steps:
• "check backend" - Verify no code errors
• git commit - Commit your changes
• "deployment status" - Check infrastructure health
```

### If tests fail with timeout:
```
⏱️  TEST TIMEOUT DETECTED

Some tests exceeded 5 second timeout:
• tests/integration/booking.test.js (8.3s)
  → Likely database connection issue
  → Check: Is Cloud SQL running?

Action: "deployment status" to check DB
```

### If tests fail to start:
```
❌ TEST EXECUTION FAILED

Error: Cannot find module 'jest'

Likely causes:
1. Dependencies not installed
2. Wrong directory
3. Missing node_modules

Fix: cd backend && npm install
```

### If database connection fails:
```
❌ DATABASE CONNECTION FAILED

Error: Connection refused to localhost:5432

Causes:
• PostgreSQL not running locally
• DATABASE_URL incorrect in .env.test

Fix for local dev:
1. Start PostgreSQL: brew services start postgresql@16
2. Or use test DB: export DATABASE_URL="postgresql://..."
3. Re-run: npm test
```

## Test Categories

### Unit Tests (Fast - <2s)
- Service logic
- Utility functions
- Model validations
- No database calls

### Integration Tests (Medium - 2-10s)
- API endpoints
- Database operations
- Authentication flows
- Business logic

### E2E Tests (Slow - >10s)
- Full user workflows
- Multi-step processes
- External integrations

## Performance Tracking

```
📊 Test Performance

Total Duration: 12.3s
├─ Unit tests: 2.1s (235 tests)
├─ Integration tests: 8.5s (32 tests)
└─ E2E tests: 1.7s (4 tests)

Slowest tests:
1. booking.test.js::create booking flow (3.2s)
2. auth.test.js::forgot password email (2.8s)
3. analytics.test.js::circling time calc (1.9s)

Note: Consider optimizing tests >2s
```

## Common Failure Patterns & Fixes

### 1. Missing Password Field
```
Error: Missing required field: password
Fix: Add password to test fixtures
File: tests/helpers/fixtures.js
```

### 2. Database Not Running
```
Error: Connection refused
Fix: Start PostgreSQL or update DATABASE_URL
Command: brew services start postgresql@16
```

### 3. Environment Variables
```
Error: JWT_SECRET is not defined
Fix: Copy .env.test.example to .env.test
Command: cp backend/.env.test.example backend/.env.test
```

### 4. Stale Database Schema
```
Error: Column 'xyz' does not exist
Fix: Run migrations on test database
Command: DATABASE_URL="..." npx prisma migrate deploy
```

### 5. Port Already in Use
```
Error: EADDRINUSE :::8080
Fix: Kill process on port 8080
Command: lsof -ti:8080 | xargs kill
```

## Integration with Other Skills

### Pre-commit workflow:
```
1. "check backend" → backend-diagnostics (code errors)
2. "run tests" → test-runner (verify tests pass)
3. git commit → Safe to commit
```

### Pre-PR workflow:
```
1. "run tests" → test-runner (verify tests)
2. "check pr" → pr-checker (launches this + more)
```

### Post-fix workflow:
```
1. Fix code
2. "run tests" → Verify fix worked
3. "check backend" → No new errors introduced
4. Commit
```

## Performance

- **Execution time:** 10-15 seconds (depends on test suite)
- **Parsing:** <1 second
- **Output generation:** <1 second
- **Total:** ~12-16 seconds

## Example Usage

**User:** "run tests"

**Assistant:**
1. Executes: `cd backend && npm test`
2. Captures full output
3. Parses Jest results
4. Identifies 34 failures with same pattern
5. Provides single fix for all 34
6. Shows ready-to-commit status: NO

**User:** [Fixes password field in fixtures]

**User:** "run tests"

**Assistant:**
1. Re-runs tests
2. All 271 tests pass
3. Shows ready-to-commit status: YES
4. Suggests next steps

## Edge Cases

### No tests found:
```
⚠️  NO TESTS FOUND

Searched in: backend/tests/
Expected: *.test.js files

Possible causes:
• Wrong directory
• Tests not named *.test.js
• Package.json test script incorrect
```

### Mix of old and new failures:
```
🔄 NEW FAILURES DETECTED

Previous run: 34 failures
Current run: 38 failures (+4 new)

New failures:
• tests/booking.test.js (4 new failures)
  → Your recent changes may have introduced these

Old failures (still present):
• tests/analytics.test.js (same 34 failures)
  → Fix these first
```

### Flaky tests:
```
⚠️  FLAKY TEST DETECTED

Test: "should handle concurrent bookings"
Result: Passed (but failed last 2 runs)

This test may be flaky. Consider:
• Adding await for async operations
• Increasing timeout
• Fixing race conditions
```

## Notes

- Always run from project root or backend directory
- Respects .env.test for test database config
- Does not modify any files
- Read-only operation
- Safe to run anytime
- Can run in parallel with other skills

# Testing Rules

**Type:** TDD and 80% coverage requirement

## Mandatory Rules

### 1. Tests Required for All New Code

❌ **NEVER** commit new features without tests

```javascript
// ❌ VIOLATION: No tests for new endpoint
// routes/bookings.js
router.post('/', createBooking);

// ✅ CORRECT: Tests included
// tests/integration/bookings.test.js
describe('POST /api/v1/bookings', () => {
  test('should create booking with valid data', async () => {
    // Test implementation
  });
});
```

### 2. Coverage Thresholds Must Be Met

**Minimum Requirements:**
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

```json
// jest.config.js or package.json
{
  "coverageThreshold": {
    "global": {
      "statements": 80,
      "branches": 75,
      "functions": 80,
      "lines": 80
    }
  }
}
```

**GitHub Actions will block merges if coverage drops below thresholds.**

### 3. Test-Driven Development (TDD)

❌ **NEVER** write implementation before tests (when possible)

```
✅ CORRECT TDD WORKFLOW:

1. 🔴 RED: Write failing test
   test('should register user', async () => {
     const response = await request(app)
       .post('/api/auth/register')
       .send(userData);
     expect(response.status).toBe(201);
   });

2. 🟢 GREEN: Write minimal code to pass
   router.post('/register', (req, res) => {
     res.status(201).json({ success: true });
   });

3. 🔵 REFACTOR: Improve code quality
   router.post('/register', validateRequest(schema), async (req, res) => {
     const user = await userService.register(req.validatedData);
     res.status(201).json({ user });
   });

4. ♻️ REPEAT: Add more tests
```

### 4. Test Naming Convention

❌ **NEVER** use vague test names

```javascript
// ❌ VIOLATION
test('test login', () => {});
test('should work', () => {});
test('booking test', () => {});

// ✅ CORRECT
test('should return 200 when credentials are valid', () => {});
test('should return 401 when password is incorrect', () => {});
test('should create booking when slot is available', () => {});
```

**Format:** `should [expected behavior] when [condition]`

### 5. Test Isolation

❌ **NEVER** share state between tests

```javascript
// ❌ VIOLATION
let userId; // Shared state

test('should create user', async () => {
  const user = await createUser();
  userId = user.id; // Mutation
});

test('should get user', async () => {
  const user = await getUser(userId); // Depends on previous test
  expect(user).toBeDefined();
});

// ✅ CORRECT
test('should create user', async () => {
  const user = await createUser();
  expect(user).toBeDefined();
});

test('should get user', async () => {
  const user = await createUser(); // Independent
  const fetched = await getUser(user.id);
  expect(fetched).toBeDefined();
});
```

### 6. Clean Up Test Data

❌ **NEVER** leave test data in database

```javascript
// ❌ VIOLATION
test('should create booking', async () => {
  const booking = await createBooking(bookingData);
  expect(booking).toBeDefined();
  // No cleanup
});

// ✅ CORRECT
describe('Bookings', () => {
  beforeEach(async () => {
    await prisma.booking.deleteMany();
  });

  afterEach(async () => {
    await prisma.booking.deleteMany();
  });

  test('should create booking', async () => {
    const booking = await createBooking(bookingData);
    expect(booking).toBeDefined();
  });
});
```

### 7. Mock External Dependencies

❌ **NEVER** call external APIs in tests

```javascript
// ❌ VIOLATION
test('should send email', async () => {
  await emailService.send(email); // Real API call
  // Test might fail due to network
});

// ✅ CORRECT
jest.mock('../services/email');

test('should send email', async () => {
  emailService.send.mockResolvedValue({ success: true });

  await userController.register(req, res);

  expect(emailService.send).toHaveBeenCalledWith({
    to: 'test@example.com',
    subject: 'Welcome to ParkPal'
  });
});
```

### 8. Test Edge Cases

❌ **NEVER** only test happy path

```javascript
// ❌ VIOLATION
test('should create booking', async () => {
  const booking = await createBooking(validData);
  expect(booking).toBeDefined();
});

// ✅ CORRECT: Test all scenarios
describe('Booking Creation', () => {
  test('should create booking with valid data', async () => {
    // Happy path
  });

  test('should return 400 when slot is invalid', async () => {
    // Validation error
  });

  test('should return 409 when slot is unavailable', async () => {
    // Conflict error
  });

  test('should return 401 when user is not authenticated', async () => {
    // Auth error
  });

  test('should handle concurrent bookings', async () => {
    // Race condition
  });
});
```

## Test Types

### Unit Tests

**Target:** 70%+ of total tests

```javascript
// Test individual functions
describe('calculatePrice', () => {
  test('should calculate price for 2 hours', () => {
    const price = calculatePrice(2, 50);
    expect(price).toBe(100);
  });

  test('should apply discount for 24+ hours', () => {
    const price = calculatePrice(25, 50);
    expect(price).toBe(1062.5); // 15% discount
  });
});
```

### Integration Tests

**Target:** 25% of total tests

```javascript
// Test module interactions
describe('POST /api/v1/bookings', () => {
  test('should create booking and update slot status', async () => {
    const response = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(bookingData);

    expect(response.status).toBe(201);

    const slot = await prisma.parkingSlot.findUnique({
      where: { id: bookingData.slotId }
    });

    expect(slot.status).toBe('occupied');
  });
});
```

### E2E Tests

**Target:** 5% of total tests (critical paths only)

```javascript
// Test complete user journeys
describe('Complete Booking Flow', () => {
  test('user can search, book, and pay for parking', async () => {
    // 1. Search for spots
    const searchResponse = await searchSpots({ lat, lon });

    // 2. Create booking
    const bookingResponse = await createBooking(searchResponse.spots[0]);

    // 3. Process payment
    const paymentResponse = await processPayment(bookingResponse.booking.id);

    // 4. Verify booking confirmed
    const booking = await getBooking(bookingResponse.booking.id);
    expect(booking.status).toBe('confirmed');
  });
});
```

## Test Organization

```
backend/
  tests/
    unit/
      services/
        auth.test.js
        booking.test.js
      utils/
        validation.test.js
    integration/
      auth.test.js
      bookings.test.js
      payments.test.js
    handshake-critical.test.js

frontend/mobile/
  src/
    __tests__/
      unit/
        components/
          Button.test.tsx
        utils/
          formatDate.test.ts
      integration/
        redux/
          bookingSlice.test.ts
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test auth.test.js

# Run in watch mode
npm run test:watch

# Run integration tests only
npm test -- --testPathPattern=integration
```

## Pre-Commit Hook

```bash
# .husky/pre-commit
npm run lint
npm run test:coverage
```

## CI/CD Enforcement

```yaml
# .github/workflows/test-coverage.yml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Check coverage thresholds
  run: |
    node test-automator/scripts/test-coverage-enforcer.js
```

## References

- [.claude/agents/tdd-guide.md](../agents/tdd-guide.md)
- [test-automator/README.md](/test-automator/README.md)
- [backend/tests/README.md](/backend/tests/README.md)

## Enforcement

**PRs will be blocked if:**
- Coverage drops below threshold
- Tests fail
- No tests added for new code

See `.github/workflows/test-coverage.yml` for automated checks.

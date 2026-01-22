# /tdd - Test-Driven Development

**Purpose:** Start test-driven development workflow

## Usage

```
/tdd <feature-or-function> [--type=<test-type>]
```

## Parameters

- `feature-or-function` (required): What to test
- `--type` (optional): Test type (unit, integration, e2e). Default: unit

## Examples

```bash
# Write unit tests for user registration
/tdd user-registration

# Write integration tests
/tdd booking-flow --type=integration

# Write E2E tests
/tdd complete-booking --type=e2e
```

## Workflow

```
1. 🔴 RED: Write failing test
   ↓
2. 🟢 GREEN: Make test pass
   ↓
3. 🔵 REFACTOR: Improve code
   ↓
4. ♻️ REPEAT
```

## What It Does

1. **Analyzes Feature**
   - Identifies testable units
   - Determines test scenarios
   - Plans test structure

2. **Generates Test Template**
   - Arrange-Act-Assert structure
   - Test cases for happy path
   - Test cases for error scenarios
   - Edge cases

3. **Guides Implementation**
   - Write minimal code to pass
   - Refactor for quality
   - Add more tests

4. **Checks Coverage**
   - Reports current coverage
   - Identifies gaps
   - Suggests additional tests

## Example Output

```javascript
// Generated test template

describe('User Registration', () => {
  describe('POST /api/v1/auth/register', () => {
    // Happy path
    test('should register user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
    });

    // Error scenarios
    test('should return 400 when email is invalid', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email');
    });

    test('should return 409 when email already exists', async () => {
      // Create existing user first
      await createUser({ email: 'test@example.com' });

      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Email already registered');
    });

    // Edge cases
    test('should hash password before storing', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      expect(user.password).not.toBe(userData.password);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash
    });
  });
});

// Next steps:
// 1. Run test (should fail 🔴)
// 2. Implement registration endpoint
// 3. Make test pass (should pass 🟢)
// 4. Refactor code (improve quality 🔵)
// 5. Add more tests (repeat ♻️)
```

## Coverage Requirements

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

## Related Commands
- `/plan` - Plan implementation
- `/test-coverage` - Check coverage
- `/code-review` - Review tests

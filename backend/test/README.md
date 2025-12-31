# Backend Test Infrastructure

## Setup

### 1. Create Test Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create test database
CREATE DATABASE parknquik_test;

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE parknquik_test TO postgres;
```

### 2. Run Migrations on Test Database

```bash
# Set DATABASE_URL temporarily
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/parknquik_test?schema=public"

# Run migrations
npx prisma migrate deploy

# Or run migrations directly
npx prisma db push
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Test Environment

- **Database**: PostgreSQL test database (`parknquik_test`)
- **Redis**: Database 1 (production uses 0)
- **Environment**: Configured via `.env.test`

## Helper Functions

Located in `/test/helpers.js`:

- `cleanDatabase()` - Truncate all tables between tests
- `createTestUser()` - Create a test user
- `createTestZone()` - Create a test zone
- `createTestParkingSlot()` - Create a test parking slot
- `generateTestToken()` - Generate JWT for authenticated requests

## Example Test

```javascript
const request = require('supertest');
const app = require('../index');
const { cleanDatabase, createTestUser, generateTestToken } = require('./helpers');

describe('Auth Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  test('POST /auth/login - success', async () => {
    const user = await createTestUser({ email: 'test@example.com' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
});
```

## Coverage Thresholds

- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

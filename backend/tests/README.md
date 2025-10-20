# Backend Tests

## Running Tests

### Test All Endpoints (Default: v1)
```bash
npm test
```

### Test Specific API Version

**Test v1 endpoints:**
```bash
API_VERSION=v1 npm test
```

**Test legacy /api endpoints (with deprecation):**
```bash
API_VERSION=legacy npm test
```

## Test Configuration

The test suite uses `tests/testConfig.js` to determine which API version to test.

- **Default**: Tests `/api/v1` endpoints
- **Legacy mode**: Tests `/api` endpoints (includes deprecation warnings)

## Test Structure

- `auth.test.js` - Authentication endpoints (register, login, password change)
- `marketplace.test.js` - Marketplace features (listings, bookings, QR check-in/out, reviews)
- `parking.test.js` - Parking slots and bookings
- `payments.test.js` - Payment processing
- `alerts.test.js` - Alert system
- `setup.js` - Test database setup and utilities
- `testConfig.js` - API version configuration

## Using testConfig in Tests

```javascript
const { url } = require('./testConfig');

// Use url() helper to make tests version-agnostic
const response = await request(app)
  .post(url('/auth/login'))  // Becomes /api/v1/auth/login or /api/auth/login
  .send({ email, password });
```

## Future Versions

When v2 is released, tests can be run against it:
```bash
API_VERSION=v2 npm test
```

Tests will automatically use `/api/v2` prefix without code changes.

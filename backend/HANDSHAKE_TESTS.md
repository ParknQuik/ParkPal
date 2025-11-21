# Backend-Frontend Handshake Tests

**Status:** ✅ **All 24 tests passing**
**Created:** November 21, 2025
**Test File:** `tests/handshake.test.js`

---

## Overview

Handshake tests verify end-to-end connectivity between the ParkPal backend API and both web and mobile frontends. These tests ensure that the API is accessible, responding correctly, and compatible with client applications.

---

## Test Coverage

### 1. Backend Health & Connectivity (3 tests)

| Test | Purpose | Status |
|------|---------|--------|
| Health check response | Verify `/health` endpoint returns proper status | ✅ Pass |
| CORS headers | Ensure cross-origin requests are allowed | ✅ Pass |
| Server metadata | Validate uptime and timestamp fields | ✅ Pass |

**Key Checks:**
- Health endpoint returns `status: "ok"`
- Database and Redis connection status
- Uptime and timestamp fields present
- CORS headers configured

---

### 2. Web Frontend Handshake (6 tests)

| Test | Purpose | Status |
|------|---------|--------|
| Accept web origin requests | Verify requests from `http://localhost:5173` | ✅ Pass |
| Google Maps API key | Authenticated endpoint provides API key | ✅ Pass |
| App configuration | Public config endpoint works | ✅ Pass |
| Web login | Login flow with email/password | ✅ Pass |
| Parking slots for map | GET `/parking/slots` endpoint | ✅ Pass |

**Tested Flows:**
1. **Login Flow:**
   ```
   Register (POST /auth/register)
   → Login (POST /auth/login)
   → Receive JWT token
   ```

2. **Maps API Key (Authenticated):**
   ```
   Login
   → GET /config/maps-api-key (with Bearer token)
   → Receive API key
   ```

3. **Public Config:**
   ```
   GET /config/app
   → Receive app features and version
   ```

---

### 3. Mobile Frontend Handshake (6 tests)

| Test | Purpose | Status |
|------|---------|--------|
| Accept mobile requests | Verify User-Agent: ParkPal Mobile | ✅ Pass |
| Google Maps API key | Mobile can fetch API key (auth) | ✅ Pass |
| Mobile login | Login with mobile User-Agent | ✅ Pass |
| User profile | GET `/auth/me` with JWT | ✅ Pass |
| Parking search | Location-based slot search | ✅ Pass |

**Tested Flows:**
1. **Mobile Login:**
   ```
   Register with User-Agent: "ParkPal Mobile/1.0 (iOS)"
   → Login
   → Receive JWT token
   ```

2. **Profile Fetch:**
   ```
   Login
   → GET /auth/me (with Bearer token)
   → Receive user profile data
   ```

3. **Location Search:**
   ```
   GET /parking/slots?lat=14.5995&lon=120.9842&radius=5
   → Receive nearby parking slots
   ```

---

### 4. API Versioning (2 tests)

| Test | Purpose | Status |
|------|---------|--------|
| Support `/api/v1` | New versioned endpoints work | ✅ Pass |
| Deprecated `/api` | Legacy endpoints return proper status | ✅ Pass |

**Verified:**
- `/api/v1/health` always returns 200
- `/api/health` may return 200 or 404 (legacy support)
- Deprecation warnings in response (if supported)

---

### 5. Error Handling (4 tests)

| Test | Purpose | Status |
|------|---------|--------|
| 404 for non-existent | Invalid endpoints return 404 | ✅ Pass |
| 401 unauthorized | Protected routes require auth | ✅ Pass |
| 400 bad request | Invalid data rejected | ✅ Pass |
| Proper error format | Errors have consistent structure | ✅ Pass |

**Error Format Tested:**
```json
{
  "error": "Error message string"
}
```

---

### 6. Performance & Limits (3 tests)

| Test | Purpose | Status |
|------|---------|--------|
| Response time | Health check < 100ms | ✅ Pass |
| Concurrent requests | Handle 10 simultaneous requests | ✅ Pass |
| Request size limits | Reject oversized payloads | ✅ Pass |

**Performance Targets:**
- Health endpoint responds in < 100ms
- Handles 10 concurrent requests without failure
- Rejects requests with 1MB+ payloads (returns 400 or 413)

---

### 7. Security Headers (2 tests)

| Test | Purpose | Status |
|------|---------|--------|
| Security headers present | helmet.js headers applied | ✅ Pass |
| XSS prevention | X-XSS-Protection header set | ✅ Pass |

**Headers Verified:**
- `X-Frame-Options` (clickjacking prevention)
- `X-Content-Type-Options` (MIME sniffing prevention)
- `X-XSS-Protection` (XSS attack prevention)

---

## Running the Tests

### Run Handshake Tests Only
```bash
cd backend
npm test tests/handshake.test.js
```

### Run All Tests (Original 110 + Handshake 24)
```bash
npm test
```

**Expected Output:**
```
Test Suites: 6 passed, 6 total
Tests:       134 passed, 134 total
Time:        ~5-6s
```

---

## Test Configuration

### Environment Setup

Tests require:
1. **PostgreSQL database** running on `localhost:5432`
2. **Test database** created: `parknquik_test`
3. **Environment variables** in `.env`:
   ```env
   NODE_ENV=test
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/parknquik_test?schema=public
   JWT_SECRET=test_jwt_secret_for_development_only_do_not_use_in_production_12345678
   ```

### Database Setup

```bash
# Start PostgreSQL (via Docker)
docker-compose up -d postgres

# Create test database
docker exec parknquik-postgres psql -U postgres -c "CREATE DATABASE parknquik_test;"

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

---

## What Each Test Suite Validates

### Backend Health
Ensures the backend is running, healthy, and can communicate its status to clients.

**Critical for:**
- Load balancer health checks
- Monitoring systems (Kubernetes liveness probes)
- Client-side "API Available" indicators

### Web Frontend Handshake
Validates that the React web app can:
- Authenticate users
- Fetch configuration (Maps API key, app features)
- Retrieve parking data for map display

**Critical for:**
- Web dashboard functionality
- Host management interface
- Admin panel access

### Mobile Frontend Handshake
Validates that the React Native mobile app can:
- Authenticate with mobile User-Agent
- Fetch user profiles
- Search for nearby parking
- Access Maps API key for location features

**Critical for:**
- Driver mobile app
- Host mobile app
- QR code scanning functionality

### API Versioning
Ensures smooth API evolution:
- New clients use `/api/v1`
- Old clients can still use `/api` (with deprecation warnings)
- Breaking changes isolated to version bumps

### Error Handling
Verifies graceful failure modes:
- Clear error messages for debugging
- Proper HTTP status codes (4xx, 5xx)
- Consistent error response format

### Performance & Limits
Protects against abuse:
- Fast response times (< 100ms for health)
- Handles concurrent load
- Rejects malicious large payloads

### Security
Validates security best practices:
- helmet.js security headers applied
- XSS protection enabled
- Clickjacking prevention
- MIME sniffing prevention

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd backend
          npm install

      - name: Create test database
        run: |
          PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE parknquik_test;"

      - name: Run migrations
        run: |
          cd backend
          npx prisma migrate deploy

      - name: Run all tests
        run: |
          cd backend
          npm test
```

---

## Troubleshooting

### Tests Fail with "EADDRINUSE"
**Problem:** Port 3001 already in use

**Solution:**
```bash
# Kill existing backend process
lsof -ti:3001 | xargs kill

# Or restart tests (they run in test mode without starting server)
npm test
```

### Tests Fail with "DATABASE_URL not found"
**Problem:** Missing `.env` file

**Solution:**
```bash
# Create .env file
cp .env.example .env

# Update DATABASE_URL
echo 'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/parknquik_test?schema=public' >> .env
```

### Tests Fail with "PrismaClientInitializationError"
**Problem:** Prisma client not generated

**Solution:**
```bash
npx prisma generate
```

### Tests Fail with "Connection refused"
**Problem:** PostgreSQL not running

**Solution:**
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Verify it's running
docker ps | grep postgres
```

---

## Maintenance

### Adding New Handshake Tests

When adding new API endpoints that frontends depend on:

1. **Add test case to `tests/handshake.test.js`:**
   ```javascript
   test('should handle new feature', async () => {
     const response = await request(app)
       .get(`${API_PREFIX}/new-feature`)
       .expect(200);

     expect(response.body).toHaveProperty('expectedField');
   });
   ```

2. **Run tests:**
   ```bash
   npm test tests/handshake.test.js
   ```

3. **Update this documentation** with new test coverage

### Updating Test Expectations

When API response format changes:

1. Update corresponding test in `tests/handshake.test.js`
2. Run tests to verify changes
3. Update this documentation if behavior changes

---

## Test Results Summary

### Current Status
```
✅ Backend Health:          3/3 passing
✅ Web Frontend:            6/6 passing
✅ Mobile Frontend:         6/6 passing
✅ API Versioning:          2/2 passing
✅ Error Handling:          4/4 passing
✅ Performance & Limits:    3/3 passing
✅ Security Headers:        2/2 passing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TOTAL:                  24/24 passing (100%)
```

### Combined with Existing Tests
```
Test Suites: 6 passed
Tests:       134 passed (110 original + 24 handshake)
Time:        ~5-6 seconds
```

---

## Benefits of Handshake Testing

### 1. **Early Detection of Integration Issues**
Catch API breaking changes before they reach production or affect clients.

### 2. **Documentation Through Tests**
Tests serve as living documentation of API contracts between backend and frontends.

### 3. **Confidence in Deployments**
Verify that backend changes don't break web or mobile apps.

### 4. **Performance Monitoring**
Track response times and detect performance regressions.

### 5. **Security Validation**
Ensure security headers and authentication are properly configured.

---

## Next Steps

### Recommended Enhancements

1. **Frontend Integration Tests:**
   - Add similar handshake tests in `frontend/web`
   - Add similar handshake tests in `frontend/mobile`

2. **Contract Testing:**
   - Use existing API contract validation system
   - Run `npm run contract:test` before deployments

3. **Load Testing:**
   - Add artillery/k6 tests for higher concurrent loads
   - Test with 100+ simultaneous users

4. **End-to-End Tests:**
   - Add Cypress tests for web (user flows)
   - Add Detox tests for mobile (user flows)

---

## Related Documentation

- [Backend Tests](./tests/README.md) - Original 110 tests
- [API Contract Testing](../API_CONTRACT_TESTING.md) - Contract validation system
- [API Versioning Guide](./API_VERSIONING_GUIDE.md) - API evolution strategy
- [Backend Security Audit](../BACKEND_SECURITY_PERFORMANCE_AUDIT.md) - Security review

---

**Maintained By:** ParkPal Backend Team
**Last Updated:** November 21, 2025
**Test Coverage:** 24 handshake tests + 110 unit/integration tests = **134 total tests**

# ParkPal Performance Testing

Comprehensive performance testing suite for the ParkPal application using Artillery, k6, and Lighthouse CI.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Interpreting Results](#interpreting-results)
- [Performance Baselines](#performance-baselines)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

This directory contains performance testing configurations and scripts for:

- **API Load Testing** - Artillery and k6 tests for backend API endpoints
- **Stress Testing** - Finding the breaking point of the system
- **Spike Testing** - Handling sudden traffic surges
- **Soak Testing** - Long-running stability tests
- **Frontend Performance** - Lighthouse CI for web performance budgets

## Prerequisites

### Required Tools

1. **Node.js** (v18 or higher)
   ```bash
   node --version
   ```

2. **Artillery** (for API load testing)
   ```bash
   npm install -g artillery@latest
   ```

3. **k6** (for advanced load testing)
   - **macOS:**
     ```bash
     brew install k6
     ```
   - **Ubuntu/Debian:**
     ```bash
     sudo gpg -k
     sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
     echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
     sudo apt-get update
     sudo apt-get install k6
     ```
   - **Windows:**
     ```powershell
     choco install k6
     ```

4. **Lighthouse CI** (for frontend performance)
   ```bash
   npm install -g @lhci/cli@latest
   ```

### Backend Requirements

Ensure the backend server is running before executing performance tests:

```bash
cd backend
npm install
npm start
```

The backend should be accessible at `http://localhost:3000` (or configure the URL in test files).

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/ParkPal.git
   cd ParkPal/performance-testing
   ```

2. **Install dependencies:**
   ```bash
   cd artillery
   npm install  # If artillery-helpers.js has dependencies
   ```

## Test Types

### 1. Artillery Tests (artillery/)

#### api-load-test.yml
**Purpose:** Realistic load testing with multiple user scenarios

**Scenarios:**
- Authentication flow (20% of traffic)
- Search and browse (35% of traffic)
- Complete booking flow (25% of traffic)
- Host dashboard operations (15% of traffic)
- Payment operations (5% of traffic)

**Phases:**
1. Warm-up: 60s @ 5 users/sec
2. Ramp-up: 120s @ 5-50 users/sec
3. Sustained: 300s @ 50 users/sec
4. Spike: 60s @ 100 users/sec
5. Cool-down: 60s @ 100-5 users/sec

**Thresholds:**
- p95 < 500ms
- p99 < 1000ms
- Error rate < 1%

#### stress-test.yml
**Purpose:** Find the breaking point of the system

**Load Progression:**
1. Stage 1: 10 users/sec (light)
2. Stage 2: 50 users/sec (moderate)
3. Stage 3: 100 users/sec (heavy)
4. Stage 4: 200 users/sec (very heavy)
5. Stage 5: 300 users/sec (extreme)
6. Stage 6: 500 users/sec (breaking point)

#### soak-test.yml
**Purpose:** 24-hour stability test to detect memory leaks

**Configuration:**
- Duration: 24 hours
- Load: 50 users/sec (constant)
- Monitors: Memory usage, connection pool, cache hit rate

### 2. k6 Tests (k6/)

#### load-test.js
**Purpose:** Comprehensive load test with custom metrics

**Features:**
- Multiple user scenarios (auth, search, booking, host)
- Custom metrics tracking (auth duration, search duration, booking duration)
- Configurable stages
- Detailed error tracking

**Usage:**
```bash
k6 run k6/load-test.js
```

#### stress-test.js
**Purpose:** Progressive stress testing

**Features:**
- Gradual load increase to 500 users
- Resource monitoring
- Breaking point identification

#### spike-test.js
**Purpose:** Test sudden traffic surges

**Features:**
- Baseline → Sudden spike → Recovery cycle
- Multiple spike patterns
- Recovery time measurement

### 3. Lighthouse CI (lighthouse/)

#### lighthouserc.json
**Purpose:** Desktop performance budgets

**Thresholds:**
- Performance: ≥90
- Accessibility: ≥95
- Best Practices: ≥90
- SEO: ≥90
- First Contentful Paint: <1.8s
- Time to Interactive: <3.8s
- Speed Index: <3.4s

#### .lighthouserc-mobile.json
**Purpose:** Mobile performance budgets

**Thresholds:**
- Performance: ≥85
- First Contentful Paint: <2.5s
- Time to Interactive: <5.0s
- Speed Index: <4.5s

## Running Tests

### Quick Start

```bash
# From project root
cd performance-testing

# Artillery load test
artillery run artillery/api-load-test.yml

# Artillery stress test
artillery run artillery/stress-test.yml

# Artillery soak test (24 hours)
artillery run artillery/soak-test.yml

# k6 load test
k6 run k6/load-test.js

# k6 stress test
k6 run k6/stress-test.js

# k6 spike test
k6 run k6/spike-test.js

# Lighthouse CI (desktop)
cd lighthouse
lhci autorun

# Lighthouse CI (mobile)
lhci autorun --config=.lighthouserc-mobile.json
```

### Generate HTML Reports

Artillery supports HTML report generation:

```bash
# Run test and save JSON output
artillery run artillery/api-load-test.yml --output reports/load-test.json

# Generate HTML report
artillery report reports/load-test.json --output reports/load-test-report.html

# Open report in browser
open reports/load-test-report.html
```

### Custom Environment Variables

```bash
# Test against different environments
BASE_URL=https://staging.parkpal.com k6 run k6/load-test.js

# Artillery with target override
artillery run artillery/api-load-test.yml --target https://staging.parkpal.com
```

### Using npm Scripts

From project root:

```bash
# Run all performance tests
npm run perf:load
npm run perf:stress
npm run perf:lighthouse
```

## Interpreting Results

### Artillery Metrics

**Key Metrics:**
- `http.requests`: Total number of requests
- `http.request_rate`: Requests per second
- `http.response_time.p95`: 95th percentile response time
- `http.response_time.p99`: 99th percentile response time
- `http.codes.200`: Successful responses
- `errors.*`: Various error types

**Good Performance:**
- p95 < 500ms
- p99 < 1000ms
- Error rate < 1%
- Request rate > 50 req/sec

**Warning Signs:**
- p95 > 500ms
- p99 > 1000ms
- Error rate > 1%
- Increasing response times over time (memory leak)

### k6 Metrics

**Key Metrics:**
- `http_req_duration`: Request duration
- `http_req_failed`: Failed requests
- `iterations`: Number of iterations completed
- `vus`: Virtual users

**Thresholds:**
```javascript
thresholds: {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
}
```

### Lighthouse Metrics

**Core Web Vitals:**
- **LCP (Largest Contentful Paint)**: <2.5s
- **FID (First Input Delay)**: <100ms
- **CLS (Cumulative Layout Shift)**: <0.1

**Performance Score:**
- 90-100: Excellent
- 50-89: Needs improvement
- 0-49: Poor

## Performance Baselines

### Current Baselines (as of Dec 2025)

**API Performance:**
- Login: p95 = 150ms, p99 = 300ms
- Search: p95 = 200ms, p99 = 400ms
- Booking: p95 = 250ms, p99 = 500ms
- Host Dashboard: p95 = 180ms, p99 = 350ms

**Frontend Performance:**
- Desktop FCP: 1.2s
- Desktop TTI: 2.8s
- Mobile FCP: 2.0s
- Mobile TTI: 4.2s

**System Capacity:**
- Max sustainable load: 200 req/sec
- Breaking point: ~500 req/sec
- Error rate at 100 req/sec: <0.5%

### Updating Baselines

After performance improvements:

1. Run full test suite
2. Document new metrics
3. Update `performance-budgets.json`
4. Commit baseline changes

## CI/CD Integration

Performance tests run automatically on:

### Pull Requests
- Quick load test (5 minutes)
- Lighthouse CI on web changes
- Results posted as PR comment

### Scheduled (Nightly)
- Full load test suite
- Stress test to find breaking points
- Trend analysis vs. previous runs

### Manual Trigger
```bash
# GitHub Actions workflow dispatch
gh workflow run performance-testing.yml
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

**Solution:** Ensure backend server is running:
```bash
cd backend && npm start
```

#### 2. High Error Rates
```
Error rate: 15% (threshold: 1%)
```

**Possible causes:**
- Database connection pool exhausted
- Rate limiting triggered
- Memory leak causing crashes

**Solution:**
- Check backend logs
- Increase connection pool size
- Review memory usage

#### 3. Slow Response Times
```
p95: 2500ms (threshold: 500ms)
```

**Possible causes:**
- Database queries not optimized
- Missing indexes
- N+1 query problem
- Cold cache

**Solution:**
- Review slow query logs
- Add database indexes
- Implement Redis caching
- Use database query optimization

#### 4. Lighthouse Fails to Start
```
Error: Unable to start Chrome
```

**Solution:**
```bash
# macOS
brew install --cask google-chrome

# Ubuntu
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
```

### Debug Mode

Run tests in debug mode for detailed logging:

```bash
# Artillery debug mode
DEBUG=http,http:response artillery run artillery/api-load-test.yml

# k6 verbose output
k6 run k6/load-test.js --verbose
```

### Resource Monitoring

Monitor system resources during tests:

```bash
# CPU and Memory
top

# Network connections
netstat -an | grep 3000

# Database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Redis memory
redis-cli INFO memory
```

## Best Practices

1. **Always test against realistic data** - Seed database with production-like data
2. **Run tests in isolated environment** - Avoid testing on production
3. **Monitor system resources** - Track CPU, memory, database connections
4. **Establish baselines** - Record metrics after each major release
5. **Test regularly** - Schedule nightly performance tests
6. **Fix degradations immediately** - Don't let performance debt accumulate
7. **Test edge cases** - High load, slow network, database failures

## Contact

For questions or issues with performance testing:
- Create an issue in GitHub
- Contact: devops@parkpal.com

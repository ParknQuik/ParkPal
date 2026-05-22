import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiCalls = new Counter('api_calls');
const recoveryTime = new Trend('recovery_time');

// Spike test configuration - sudden traffic surges
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Baseline
    { duration: '30s', target: 10 },   // Stable baseline
    { duration: '10s', target: 200 },  // Sudden spike!
    { duration: '1m', target: 200 },   // Maintain spike
    { duration: '10s', target: 10 },   // Sudden drop
    { duration: '30s', target: 10 },   // Recovery monitoring
    { duration: '10s', target: 500 },  // Massive spike!
    { duration: '1m', target: 500 },   // Maintain massive spike
    { duration: '30s', target: 10 },   // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // Reasonable during spikes
    http_req_failed: ['rate<0.05'],                  // Allow 5% failures during spikes
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_V1 = `${BASE_URL}/api/v1`;

function randomCoordinates() {
  return {
    latitude: (Math.random() * (14.7680 - 14.4074) + 14.4074).toFixed(6),
    longitude: (Math.random() * (121.1215 - 120.9382) + 120.9382).toFixed(6),
  };
}

export default function () {
  const startTime = Date.now();

  // Simulate real user behavior during traffic spike
  const scenarios = [
    // Homepage/Search (60% of traffic)
    () => {
      const coords = randomCoordinates();
      const response = http.get(
        `${API_V1}/marketplace/listings?latitude=${coords.latitude}&longitude=${coords.longitude}&radius=5`,
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { scenario: 'search' },
        }
      );

      apiCalls.add(1);

      const success = check(response, {
        'search status ok': (r) => [200, 429, 503].includes(r.status),
        'response time acceptable': (r) => r.timings.duration < 3000,
      });

      errorRate.add(!success);
    },

    // Authentication (20% of traffic)
    () => {
      const response = http.post(
        `${API_V1}/auth/login`,
        JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { scenario: 'auth' },
        }
      );

      apiCalls.add(1);

      const success = check(response, {
        'auth status ok': (r) => [200, 401, 429, 503].includes(r.status),
        'response time acceptable': (r) => r.timings.duration < 2000,
      });

      errorRate.add(!success);
    },

    // Listing details (15% of traffic)
    () => {
      const listingId = Math.floor(Math.random() * 100) + 1;
      const response = http.get(`${API_V1}/marketplace/listings/${listingId}`, {
        headers: { 'Content-Type': 'application/json' },
        tags: { scenario: 'details' },
      });

      apiCalls.add(1);

      const success = check(response, {
        'details status ok': (r) => [200, 404, 429, 503].includes(r.status),
      });

      errorRate.add(!success);
    },

    // Health check (5% of traffic)
    () => {
      const response = http.get(`${BASE_URL}/health`, {
        tags: { scenario: 'health' },
      });

      apiCalls.add(1);

      check(response, {
        'health check ok': (r) => r.status === 200,
      });
    },
  ];

  // Execute scenario based on weighted distribution
  const random = Math.random();
  if (random < 0.6) {
    scenarios[0](); // Search
  } else if (random < 0.8) {
    scenarios[1](); // Auth
  } else if (random < 0.95) {
    scenarios[2](); // Details
  } else {
    scenarios[3](); // Health
  }

  const endTime = Date.now();
  recoveryTime.add(endTime - startTime);

  sleep(Math.random() * 2); // Random sleep 0-2s
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    testType: 'spike',
    metrics: {
      totalRequests: data.metrics.api_calls?.values?.count || 0,
      errorRate: ((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2) + '%',
      p95ResponseTime: Math.round(data.metrics.http_req_duration?.values?.['p(95)'] || 0) + 'ms',
      p99ResponseTime: Math.round(data.metrics.http_req_duration?.values?.['p(99)'] || 0) + 'ms',
      maxResponseTime: Math.round(data.metrics.http_req_duration?.values?.max || 0) + 'ms',
      avgRecoveryTime: Math.round(data.metrics.recovery_time?.values?.avg || 0) + 'ms',
    },
    thresholdsPassed: Object.keys(data.metrics)
      .filter((key) => data.metrics[key].thresholds)
      .every((key) => {
        const thresholds = data.metrics[key].thresholds;
        return Object.values(thresholds).every((t) => t.ok);
      }),
  };

  console.log('\n=== Spike Test Summary ===');
  console.log(JSON.stringify(summary, null, 2));

  return {
    'performance-testing/reports/spike-test-summary.json': JSON.stringify(data, null, 2),
    stdout: JSON.stringify(summary, null, 2),
  };
}

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiCalls = new Counter('api_calls');

// Stress test configuration - find breaking point
export const options = {
  stages: [
    { duration: '1m', target: 10 },    // Stage 1: Light load
    { duration: '1m', target: 50 },    // Stage 2: Moderate load
    { duration: '1m', target: 100 },   // Stage 3: Heavy load
    { duration: '1m', target: 200 },   // Stage 4: Very heavy load
    { duration: '1m', target: 300 },   // Stage 5: Extreme load
    { duration: '1m', target: 500 },   // Stage 6: Breaking point
    { duration: '2m', target: 500 },   // Stage 7: Maintain peak
    { duration: '2m', target: 0 },     // Stage 8: Recovery
  ],
  // No strict thresholds - we want to see where it breaks
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // Relaxed thresholds
    http_req_failed: ['rate<0.05'],                  // Allow 5% error rate
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
  // Mixed operations under stress
  const operations = [
    // Search operations (50%)
    () => {
      const coords = randomCoordinates();
      const response = http.get(
        `${API_V1}/marketplace/listings?latitude=${coords.latitude}&longitude=${coords.longitude}&radius=5`,
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { operation: 'search' },
        }
      );

      apiCalls.add(1);

      const success = check(response, {
        'search successful': (r) => r.status === 200 || r.status === 429 || r.status === 503,
      });

      errorRate.add(!success);
    },

    // Authentication (30%)
    () => {
      const response = http.post(
        `${API_V1}/auth/login`,
        JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { operation: 'auth' },
        }
      );

      apiCalls.add(1);

      const success = check(response, {
        'auth successful': (r) => r.status === 200 || r.status === 429 || r.status === 503,
      });

      errorRate.add(!success);
    },

    // Database-intensive operations (20%)
    () => {
      const response = http.get(`${API_V1}/marketplace/listings?page=1&limit=50`, {
        headers: { 'Content-Type': 'application/json' },
        tags: { operation: 'database' },
      });

      apiCalls.add(1);

      const success = check(response, {
        'db query successful': (r) => r.status === 200 || r.status === 429 || r.status === 503,
      });

      errorRate.add(!success);
    },
  ];

  // Execute random operation
  const random = Math.random();
  if (random < 0.5) {
    operations[0](); // Search
  } else if (random < 0.8) {
    operations[1](); // Auth
  } else {
    operations[2](); // Database
  }

  sleep(0.5); // Minimal sleep for stress
}

// Teardown function to log results
export function handleSummary(data) {
  console.log('Stress Test Summary:');
  console.log(`- Total Requests: ${data.metrics.api_calls.values.count}`);
  console.log(`- Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%`);
  console.log(`- P95 Response Time: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  console.log(`- P99 Response Time: ${data.metrics.http_req_duration.values['p(99)']}ms`);
  console.log(`- Max VUs: ${data.state.testRunDurationMs}`);

  return {
    'performance-testing/reports/stress-test-summary.json': JSON.stringify(data, null, 2),
  };
}

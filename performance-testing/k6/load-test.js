import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const authDuration = new Trend('auth_duration');
const searchDuration = new Trend('search_duration');
const bookingDuration = new Trend('booking_duration');
const apiCalls = new Counter('api_calls');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Warm-up
    { duration: '3m', target: 50 },   // Ramp-up
    { duration: '5m', target: 50 },   // Sustained load
    { duration: '2m', target: 100 },  // Spike
    { duration: '2m', target: 50 },   // Stabilize
    { duration: '1m', target: 0 },    // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                  // Error rate < 1%
    errors: ['rate<0.01'],
    'http_req_duration{scenario:auth}': ['p(95)<300'],
    'http_req_duration{scenario:search}': ['p(95)<400'],
    'http_req_duration{scenario:booking}': ['p(95)<600'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_V1 = `${BASE_URL}/api/v1`;

// Test data generators
function randomEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

function randomPhoneNumber() {
  const prefixes = ['917', '918', '919', '920', '921'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `+639${prefix}${suffix}`;
}

function randomCoordinates() {
  // Metro Manila bounds
  return {
    latitude: (Math.random() * (14.7680 - 14.4074) + 14.4074).toFixed(6),
    longitude: (Math.random() * (121.1215 - 120.9382) + 120.9382).toFixed(6),
  };
}

// Scenario 1: User Registration and Authentication
export function authScenario() {
  group('Authentication Flow', () => {
    const email = randomEmail();
    const password = 'SecurePass123!@#';

    // Registration
    let response = http.post(
      `${API_V1}/auth/register`,
      JSON.stringify({
        name: `Test User ${Math.random().toString(36).substring(7)}`,
        email: email,
        password: password,
        phoneNumber: randomPhoneNumber(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { scenario: 'auth' },
      }
    );

    apiCalls.add(1);
    authDuration.add(response.timings.duration);

    const registerSuccess = check(response, {
      'registration status is 201': (r) => r.status === 201,
      'has token': (r) => r.json('token') !== undefined,
    });

    errorRate.add(!registerSuccess);

    if (registerSuccess) {
      const token = response.json('token');

      // Get profile
      response = http.get(`${API_V1}/auth/profile`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        tags: { scenario: 'auth' },
      });

      apiCalls.add(1);

      check(response, {
        'profile status is 200': (r) => r.status === 200,
        'has user data': (r) => r.json('user') !== undefined,
      });
    }

    sleep(1);
  });
}

// Scenario 2: Search and Browse
export function searchScenario() {
  group('Search and Browse', () => {
    const coords = randomCoordinates();

    // Search listings
    let response = http.get(
      `${API_V1}/marketplace/listings?latitude=${coords.latitude}&longitude=${coords.longitude}&radius=5`,
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { scenario: 'search' },
      }
    );

    apiCalls.add(1);
    searchDuration.add(response.timings.duration);

    const searchSuccess = check(response, {
      'search status is 200': (r) => r.status === 200,
      'has listings': (r) => Array.isArray(r.json()),
    });

    errorRate.add(!searchSuccess);

    if (searchSuccess && response.json().length > 0) {
      const listings = response.json();
      const randomListing = listings[Math.floor(Math.random() * listings.length)];

      // Get listing details
      response = http.get(`${API_V1}/marketplace/listings/${randomListing.id}`, {
        headers: { 'Content-Type': 'application/json' },
        tags: { scenario: 'search' },
      });

      apiCalls.add(1);

      check(response, {
        'listing detail status is 200': (r) => r.status === 200,
        'has listing data': (r) => r.json('id') !== undefined,
      });
    }

    // Search parking spots (alternative endpoint)
    response = http.get(
      `${API_V1}/parking/spots?latitude=${coords.latitude}&longitude=${coords.longitude}`,
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { scenario: 'search' },
      }
    );

    apiCalls.add(1);

    check(response, {
      'parking spots status is 200': (r) => r.status === 200,
    });

    sleep(2);
  });
}

// Scenario 3: Complete Booking Flow
export function bookingScenario() {
  group('Booking Flow', () => {
    // Login
    const loginResponse = http.post(
      `${API_V1}/auth/login`,
      JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { scenario: 'booking' },
      }
    );

    apiCalls.add(1);

    const loginSuccess = check(loginResponse, {
      'login status is 200': (r) => r.status === 200,
      'has token': (r) => r.json('token') !== undefined,
    });

    if (!loginSuccess) {
      errorRate.add(1);
      return;
    }

    const token = loginResponse.json('token');
    const coords = randomCoordinates();

    // Search for available spots
    let response = http.get(
      `${API_V1}/marketplace/listings?latitude=${coords.latitude}&longitude=${coords.longitude}&radius=5`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        tags: { scenario: 'booking' },
      }
    );

    apiCalls.add(1);

    if (response.status === 200 && response.json().length > 0) {
      const listing = response.json()[0];

      // Create booking
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours

      response = http.post(
        `${API_V1}/marketplace/bookings`,
        JSON.stringify({
          listingId: listing.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          vehicleInfo: {
            plateNumber: `ABC${Math.floor(Math.random() * 900) + 100}`,
            vehicleType: 'sedan',
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          tags: { scenario: 'booking' },
        }
      );

      apiCalls.add(1);
      bookingDuration.add(response.timings.duration);

      const bookingSuccess = check(response, {
        'booking status is 201 or 400': (r) => r.status === 201 || r.status === 400,
      });

      errorRate.add(!bookingSuccess);

      if (response.status === 201) {
        const bookingId = response.json('booking.id');

        // Get booking details
        response = http.get(`${API_V1}/marketplace/bookings/${bookingId}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          tags: { scenario: 'booking' },
        });

        apiCalls.add(1);

        check(response, {
          'booking detail status is 200': (r) => r.status === 200,
        });
      }
    }

    sleep(3);
  });
}

// Scenario 4: Host Dashboard
export function hostScenario() {
  group('Host Dashboard', () => {
    // Host login
    const loginResponse = http.post(
      `${API_V1}/auth/login`,
      JSON.stringify({
        email: 'host@example.com',
        password: 'password123',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { scenario: 'host' },
      }
    );

    apiCalls.add(1);

    if (loginResponse.status === 200) {
      const token = loginResponse.json('token');

      // Get host listings
      let response = http.get(`${API_V1}/marketplace/host/listings`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        tags: { scenario: 'host' },
      });

      apiCalls.add(1);

      check(response, {
        'host listings status is 200': (r) => r.status === 200,
      });

      // Get earnings
      response = http.get(`${API_V1}/marketplace/host/earnings`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        tags: { scenario: 'host' },
      });

      apiCalls.add(1);

      check(response, {
        'earnings status is 200': (r) => r.status === 200,
      });

      // Get bookings
      response = http.get(`${API_V1}/marketplace/host/bookings`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        tags: { scenario: 'host' },
      });

      apiCalls.add(1);

      check(response, {
        'host bookings status is 200': (r) => r.status === 200,
      });
    }

    sleep(2);
  });
}

// Default function - mixed scenarios
export default function () {
  const scenarios = [searchScenario, authScenario, bookingScenario, hostScenario];
  const weights = [0.4, 0.2, 0.3, 0.1]; // Search: 40%, Auth: 20%, Booking: 30%, Host: 10%

  const random = Math.random();
  let cumulative = 0;

  for (let i = 0; i < scenarios.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      scenarios[i]();
      break;
    }
  }
}
